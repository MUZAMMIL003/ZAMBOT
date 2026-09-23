/**
 * Conversation turns.
 *
 * The user's turn is a white bubble on the right; the assistant's is plain
 * text on the background. Every assistant answer can show where it came from
 * without leaving the chat:
 *
 *  - citation pills  -> hover (or tap) for the quoted passage, click through to
 *                       the page in the document panel
 *  - source cards    -> the same passages as a list under the answer
 *  - tables          -> rendered, copyable, downloadable as CSV (all in-browser)
 *  - "closest"       -> when the answer is not in the documents, the nearest
 *                       passage, so the user always has somewhere to go
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { FileTypeIcon, Icon, type IconName } from "@/components/ui/Icon";
import type { Source, SandboxRun } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SandboxBlock } from "./SandboxBlock";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
  verified?: boolean | null;
  verificationNote?: string | null;
  rewritten?: string | null;
  streaming?: boolean;
  sandbox_runs?: SandboxRun[] | null;
  related?: string[] | null;
  closest?: Source | null;
  /** A question waiting for the documents to finish reading. */
  queued?: boolean;
}

type OpenSource = (source: Source) => void;

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const plainText = (text: string) => text.replace(/\s?\[\d+\]/g, "");

// ------------------------------------------------------------------ text
function RichText({
  text,
  sources,
  onOpenSource,
}: {
  text: string;
  sources: Source[];
  onOpenSource: OpenSource;
}) {
  const blocks = useMemo(() => text.split(/\n{2,}/), [text]);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.trim().split("\n");
        if (lines.length >= 2 && lines.every((line) => line.trim().startsWith("|"))) {
          return <TableBlock key={blockIndex} lines={lines} />;
        }
        return (
          <p
            key={blockIndex}
            className={cn("text-[15px] leading-relaxed", blockIndex > 0 && "mt-3")}
          >
            {block.split(/(\[\d+\])/g).map((part, partIndex) => {
              const citation = part.match(/^\[(\d+)\]$/);
              if (citation) {
                const number = Number(citation[1]);
                return (
                  <CitationPill
                    key={partIndex}
                    number={number}
                    source={sources.find((s) => s.citation === number)}
                    onOpen={onOpenSource}
                  />
                );
              }
              return (
                <Fragment key={partIndex}>
                  {part.split("\n").map((line, i, all) => (
                    <Fragment key={i}>
                      {line}
                      {i < all.length - 1 && <br />}
                    </Fragment>
                  ))}
                </Fragment>
              );
            })}
          </p>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- tables
function parseTable(lines: string[]): string[][] {
  return lines
    .map((line) => line.trim())
    .filter((line) => !/^\|[\s:|-]+\|$/.test(line)) // the |---|---| divider
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
}

const csvCell = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

function TableBlock({ lines }: { lines: string[] }) {
  const rows = useMemo(() => parseTable(lines), [lines]);
  const [copied, setCopied] = useState(false);
  const [head, ...body] = rows;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const download = () => {
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "zambot-table.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rows.map((row) => row.join("\t")).join("\n"));
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  if (!head) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="bg-black/[0.03]">
              {head.map((cell, i) => (
                <th key={i} className="px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-t border-black/5">
                {row.map((cell, c) => (
                  <td key={c} className={cn("px-3.5 py-2.5", c === 0 && "font-medium")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-black/5 px-2 py-1.5">
        <ActionButton icon={copied ? "check" : "copy"} label={copied ? "Copied" : "Copy table"} onClick={() => void copy()} />
        <ActionButton icon="download" label="Download CSV" onClick={download} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------- citations
const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function CitationPill({
  number,
  source,
  onOpen,
}: {
  number: number;
  source?: Source;
  onOpen: OpenSource;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 180);
  };
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={source ? `Source ${number}: ${source.filename}, ${source.label}` : `Source ${number}`}
        aria-expanded={open}
        onMouseEnter={() => canHover() && show()}
        onMouseLeave={() => canHover() && hideSoon()}
        onClick={() => {
          if (!source) return;
          // Mouse: the pop-up is already showing, so a click goes straight to the page.
          if (canHover()) onOpen(source);
          else setOpen((v) => !v);
        }}
        className={cn(
          "mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-[2px] items-center justify-center rounded-[6px] px-1 align-middle text-[10.5px] font-bold transition-colors",
          open
            ? "bg-black/[0.18] text-[rgb(var(--text))]"
            : "bg-black/[0.07] text-[rgb(var(--text))]/70 hover:bg-black/[0.14] hover:text-[rgb(var(--text))]",
        )}
      >
        {number}
      </button>
      {source && (
        <SourcePopover
          anchor={anchor}
          open={open}
          source={source}
          onClose={() => setOpen(false)}
          onEnter={show}
          onLeave={hideSoon}
          onOpen={(s) => {
            setOpen(false);
            onOpen(s);
          }}
        />
      )}
    </>
  );
}

function SourcePopover({
  anchor,
  open,
  source,
  onClose,
  onEnter,
  onLeave,
  onOpen,
}: {
  anchor: RefObject<HTMLElement>;
  open: boolean;
  source: Source;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
  onOpen: OpenSource;
}) {
  const [style, setStyle] = useState<CSSProperties>({});
  const panel = useRef<HTMLDivElement>(null);

  // Position against the pill, flipped above when there is no room below.
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12,
    );
    const below = window.innerHeight - rect.bottom > 250;
    setStyle(
      below
        ? { left, width, top: rect.bottom + 8 }
        : { left, width, bottom: window.innerHeight - rect.top + 8 },
    );
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target)) onClose();
    };
    const onScroll = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, anchor]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-label={`Source: ${source.filename}, ${source.label}`}
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          style={style}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="fixed z-[60] rounded-2xl border border-black/5 bg-white p-3.5 text-left shadow-lifted"
        >
          <SourceHeader source={source} />
          {source.snippet && (
            <blockquote className="mt-2.5 border-l-2 border-[#E8C547] bg-[#FFF8DC] py-1.5 pl-3 pr-2 text-[13px] leading-relaxed text-[rgb(var(--text))]/85">
              {source.snippet}
            </blockquote>
          )}
          <button
            type="button"
            onClick={() => onOpen(source)}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-full bg-black/[0.05] text-[13px] font-medium text-[rgb(var(--text))] transition-colors hover:bg-black/[0.09]"
          >
            <Icon name="fileText" size={15} />
            Open {source.label.toLowerCase()} in document
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SourceHeader({ source }: { source: Source }) {
  return (
    <div className="flex items-center gap-2.5">
      <FileTypeIcon extension={extensionOf(source.filename)} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{source.filename}</span>
        <span className="block text-[11.5px] text-muted">{source.label}</span>
      </span>
    </div>
  );
}

// ------------------------------------------------------------- the turn
export function Message({
  message,
  isLast = false,
  onOpenSource,
  onAsk,
  onRegenerate,
}: {
  message: DisplayMessage;
  isLast?: boolean;
  onOpenSource: OpenSource;
  onAsk?: (question: string) => void;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex w-full flex-col", isUser ? "items-end" : "items-start")}
    >
      <div className={cn("min-w-0", isUser ? "max-w-[85%] sm:max-w-[75%]" : "w-full")}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-sm bg-[rgb(var(--surface))] px-5 py-3.5 shadow-sm">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[rgb(var(--text))]">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="py-2 text-[rgb(var(--text))]">
            <RichText text={message.content} sources={sources} onOpenSource={onOpenSource} />
            {message.streaming && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-caret bg-[rgb(var(--accent-bright))]"
              />
            )}
          </div>
        )}

        {isUser && message.queued && (
          <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[12px] text-muted">
            <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            I will answer as soon as reading finishes
          </p>
        )}

        {!isUser && !message.streaming && (
          <>
            {message.sandbox_runs && message.sandbox_runs.length > 0 && (
              <SandboxBlock runs={message.sandbox_runs} />
            )}

            {message.closest && <ClosestPassage source={message.closest} onOpen={onOpenSource} />}

            {sources.length > 0 && <SourceCards sources={sources} onOpen={onOpenSource} />}

            <AnswerFooter message={message} onOpenSource={onOpenSource} onRegenerate={onRegenerate} />

            {isLast && onAsk && message.related && message.related.length > 0 && (
              <RelatedQuestions questions={message.related} onAsk={onAsk} />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------- answer extras
function AnswerFooter({
  message,
  onOpenSource,
  onRegenerate,
}: {
  message: DisplayMessage;
  onOpenSource: OpenSource;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const first = message.sources?.[0];

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainText(message.content));
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  }, [message.content]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2">
      <VerifiedBadge verified={message.verified ?? null} note={message.verificationNote} />
      <div className="flex items-center">
        <ActionButton icon={copied ? "check" : "copy"} label={copied ? "Copied" : "Copy"} onClick={() => void copy()} />
        {onRegenerate && <ActionButton icon="refresh" label="Regenerate" onClick={onRegenerate} />}
        {first && <ActionButton icon="fileText" label="Show in document" onClick={() => onOpenSource(first)} />}
      </div>
      {message.rewritten && (
        <span
          title={`Searched for: ${message.rewritten}`}
          className="w-full truncate px-1 text-[11.5px] text-muted"
        >
          Searched for: {message.rewritten}
        </span>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  iconClassName,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-[rgb(var(--text))]/60 transition-colors hover:bg-white/70 hover:text-[rgb(var(--text))]"
    >
      <Icon name={icon} size={14} className={iconClassName} />
      {label}
    </button>
  );
}

/** Verification state. Never colour-only - each state carries an icon + word. */
function VerifiedBadge({ verified, note }: { verified: boolean | null; note?: string | null }) {
  if (verified == null) return null;
  return (
    <span
      title={
        verified ? "Every claim was checked against the quoted passages" : note || "Could not verify this answer"
      }
      className={cn(
        "mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        verified ? "bg-positive/20 text-emerald-700" : "bg-caution/20 text-amber-700",
      )}
    >
      <Icon name={verified ? "verified" : "alert"} size={12} strokeWidth={2} />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

function SourceCards({ sources, onOpen }: { sources: Source[]; onOpen: OpenSource }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {sources.map((source, index) => (
        <motion.button
          key={source.chunk_id}
          type="button"
          onClick={() => onOpen(source)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.25 }}
          aria-label={`Open ${source.filename} at ${source.label}`}
          className="group flex flex-col gap-1.5 rounded-2xl border border-black/5 bg-white/70 p-3 text-left shadow-sm backdrop-blur-md transition-colors hover:bg-white"
        >
          <span className="flex w-full items-center gap-2">
            <span className="grid h-5 min-w-[20px] place-items-center rounded-md bg-black/[0.07] px-1 text-[10.5px] font-semibold text-[rgb(var(--text))]/70">
              {source.citation ?? index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{source.filename}</span>
            <span className="shrink-0 text-[11.5px] text-muted">{source.label}</span>
          </span>
          {source.snippet && (
            <span className="line-clamp-2 text-[12.5px] leading-snug text-[rgb(var(--text))]/65">
              “{source.snippet}”
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function ClosestPassage({ source, onOpen }: { source: Source; onOpen: OpenSource }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-black/15 bg-white/50 p-3.5">
      <p className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wider text-muted">
        <Icon name="findText" size={14} />
        Closest passage I found - not a direct answer
      </p>
      {source.snippet && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[rgb(var(--text))]/80">“{source.snippet}”</p>
      )}
      <button
        type="button"
        onClick={() => onOpen(source)}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium underline-offset-2 hover:underline"
      >
        <Icon name="fileText" size={14} />
        {source.filename} · {source.label}
      </button>
    </div>
  );
}

function RelatedQuestions({ questions, onAsk }: { questions: string[]; onAsk: (q: string) => void }) {
  return (
    <div className="mt-5">
      <p className="mb-2 px-1 text-[11.5px] font-medium uppercase tracking-wider text-muted">Related</p>
      <div className="flex flex-col items-start gap-1.5">
        {questions.map((question, index) => (
          <motion.button
            key={question}
            type="button"
            onClick={() => onAsk(question)}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="flex max-w-full items-center gap-2 rounded-full border border-white/60 bg-white/55 py-2 pl-3 pr-4 text-left text-[13.5px] shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            <Icon name="cornerDownRight" size={14} className="shrink-0 text-muted" />
            <span className="truncate">{question}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- thinking
const STAGE_LABELS: Record<string, string> = {
  remembering: "Recalling the conversation",
  rewriting: "Working out what you mean",
  retrieving: "Searching your documents",
  sandbox: "Calculating from the document",
  generating: "Writing the answer",
  verifying: "Checking it against the source",
  reretrieving: "Looking again",
};

export function Thinking({ stage }: { stage?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-full bg-white/60 px-5 py-2.5 shadow-sm backdrop-blur-md"
      >
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-bright))]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
            />
          ))}
        </span>
        <span className="text-[13.5px] font-medium text-[rgb(var(--text))]/70">
          {(stage && STAGE_LABELS[stage]) || "Thinking"}…
        </span>
      </div>
    </motion.div>
  );
}
