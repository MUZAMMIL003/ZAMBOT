/**
 * How a document is read, step by step.
 *
 *   Upload → Inspect → Extract → Split into passages → Map the meaning → File it away
 *
 * Collapsed, it is one line: the file, a six-part progress bar and what is
 * happening right now. Opened, every step shows what it does in plain words,
 * how long it took, what it found (pages, tables, passages, a sample
 * passage...) and - for the sandbox steps - the exact code that ran and what
 * it printed. The same view is kept after reading, so it can be revisited
 * from the brief or the Sources tab at any time.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { PixelMark, type PixelMode } from "@/components/ui/PixelMark";
import {
  FAILED,
  METHOD,
  PHASES,
  PROCESSING,
  activePhase,
  duration,
  fraction,
  number,
  percentOf,
  phase,
  phasesOf,
  plural,
  stepsFor,
} from "@/lib/pipeline";
import type { DocumentRecord, LiveStep, Phase, PhaseStatus } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** A tick that re-renders once a second while something is running. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

// ------------------------------------------------------------ component
export function ReadingPipeline({
  document,
  defaultOpen = false,
  onRetry,
  className,
}: {
  document: DocumentRecord;
  defaultOpen?: boolean;
  onRetry?: (documentId: string) => void;
  className?: string;
}) {
  const phases = phasesOf(document);
  const steps = document.live?.steps ?? [];
  const running = PROCESSING.includes(document.status);
  const failed = FAILED.includes(document.status);
  const [open, setOpen] = useState(defaultOpen);
  const now = useNow(running);

  const current = activePhase(phases);
  const currentMeta = PHASES.find((p) => p.key === current?.key);
  const percent = document.status === "ready" ? 100 : percentOf(phases);
  const started = phases.find((p) => p.started_at)?.started_at ?? null;
  const finished = [...phases].reverse().find((p) => p.ended_at)?.ended_at ?? null;
  const elapsed = started ? (running ? now : finished ?? now) - started : null;

  const status = failed
    ? document.status === "manual_review"
      ? "Needs review"
      : "Could not be read"
    : running
      ? `${percent}%`
      : elapsed
        ? `Read in ${duration(elapsed)}`
        : "Ready";

  return (
    <div className={cn("rounded-2xl bg-white/70 ring-1 ring-black/[0.05]", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 pb-2.5 pt-3 text-left"
      >
        <FileTypeIcon extension={document.extension} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13.5px] font-medium">{document.filename}</span>
            <span className={cn("shrink-0 font-mono text-[11.5px] tabular-nums", failed ? "text-danger" : "text-muted")}>
              {status}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-muted">
            {document.extension.toUpperCase()} · {formatBytes(document.size_bytes)}
            {running && elapsed != null ? ` · ${duration(elapsed)} so far` : ""}
          </span>
        </span>
        <Icon name="chevronDown" size={15} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      <div className="px-3.5">
        <SegmentBar phases={phases} />
      </div>

      {(running || failed) && current && currentMeta && (
        <div className="flex items-center gap-2.5 px-3.5 pt-2.5">
          <PixelMark mode={failed ? "error" : currentMeta.mode} size={16} />
          <span className="min-w-0 flex-1 truncate text-[12.5px]">
            <span className="font-medium">{failed ? `${currentMeta.title} failed` : currentMeta.doing}</span>
            {current.detail && <span className="text-muted"> · {current.detail}</span>}
          </span>
        </div>
      )}

      {failed && (
        <div className="mt-2 flex items-start gap-3 px-3.5">
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[rgb(var(--text))]/75">
            {document.error || "This document could not be processed."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={() => onRetry(document.id)}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium shadow-sm ring-1 ring-black/10 hover:bg-black/[0.03]"
            >
              <Icon name="refresh" size={13} />
              Retry
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <ol className="relative mt-3 border-t border-black/[0.05] px-3.5 pb-1 pt-3">
              {PHASES.map((meta, index) => (
                <PhaseRow
                  key={meta.key}
                  meta={meta}
                  phase={phases[index] ?? phase(meta.key, "pending")}
                  steps={stepsFor(meta.key, steps)}
                  last={index === PHASES.length - 1}
                  now={now}
                  index={index}
                />
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-3" />
    </div>
  );
}

// ---------------------------------------------------------------- pieces
function SegmentBar({ phases }: { phases: Phase[] }) {
  return (
    <div className="flex gap-[3px]" role="presentation">
      {PHASES.map((meta, index) => {
        const p = phases[index];
        const fill = p ? fraction(p) : 0;
        return (
          <span
            key={meta.key}
            title={meta.title}
            className={cn(
              "relative h-[5px] overflow-hidden rounded-full",
              p?.status === "failed" ? "bg-danger/25" : "bg-black/[0.07]",
              p?.status === "skipped" && "bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.12)_0_2px,transparent_2px_4px)]",
            )}
            style={{ flex: meta.weight }}
          >
            <motion.span
              className={cn("absolute inset-y-0 left-0 rounded-full", p?.status === "failed" ? "bg-danger" : "bg-[rgb(var(--text))]")}
              initial={false}
              animate={{ width: `${(p?.status === "failed" ? 1 : fill) * 100}%` }}
              transition={{ duration: 0.7, ease: EASE }}
            />
            {p?.status === "active" && (
              <span className="absolute inset-0 animate-[pipeline-sheen_1.6s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)]" />
            )}
          </span>
        );
      })}
    </div>
  );
}

function Node({ status, mode }: { status: PhaseStatus; mode: PixelMode }) {
  if (status === "active") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-black/10">
        <PixelMark mode={mode} size={18} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "grid h-7 w-7 place-items-center rounded-lg transition-colors",
        status === "done" && "bg-[rgb(var(--text))] text-white",
        status === "failed" && "bg-danger text-white",
        status === "skipped" && "bg-black/[0.06] text-muted",
        status === "pending" && "bg-white/60 text-muted ring-1 ring-inset ring-black/10",
      )}
    >
      {status === "done" && <Icon name="check" size={14} strokeWidth={2.6} />}
      {status === "failed" && <Icon name="x" size={14} strokeWidth={2.6} />}
      {status === "skipped" && <span className="h-[2px] w-2.5 rounded-full bg-current" />}
      {status === "pending" && <span className="h-1.5 w-1.5 rounded-[2px] bg-current opacity-50" />}
    </span>
  );
}

function PhaseRow({
  meta,
  phase: p,
  steps,
  last,
  now,
  index,
}: {
  meta: (typeof PHASES)[number];
  phase: Phase;
  steps: LiveStep[];
  last: boolean;
  now: number;
  index: number;
}) {
  const hasBody = p.status !== "pending" && (Object.keys(p.facts).length > 0 || steps.length > 0);
  // A step opens itself while it runs (or when it fails) and folds away when
  // it is done - unless it was opened by hand, which is respected.
  const [open, setOpen] = useState(p.status === "active" || p.status === "failed");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (p.status === "active" || p.status === "failed") setOpen(true);
    else if (!touched) setOpen(false);
  }, [p.status, touched]);

  const took = p.started_at ? (p.ended_at ?? now) - p.started_at : null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: EASE }}
      className="relative flex gap-3 pb-3.5"
    >
      {!last && (
        <span aria-hidden className="absolute bottom-0 left-[13.5px] top-8 w-px bg-black/[0.08]">
          <motion.span
            className="absolute inset-x-0 top-0 bg-[rgb(var(--text))]"
            initial={false}
            animate={{ height: p.status === "done" || p.status === "skipped" ? "100%" : "0%" }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </span>
      )}
      <Node status={p.status} mode={meta.mode} />
      <div className="min-w-0 flex-1 pt-[3px]">
        <button
          type="button"
          disabled={!hasBody}
          onClick={() => {
            setTouched(true);
            setOpen((value) => !value);
          }}
          aria-expanded={hasBody ? open : undefined}
          className="flex w-full items-baseline gap-2 text-left disabled:cursor-default"
        >
          <span className={cn("text-[13px] font-medium", p.status === "pending" && "text-[rgb(var(--text))]/45")}>
            {meta.title}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{p.detail}</span>
          {took != null && (
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">{duration(took)}</span>
          )}
          {hasBody && (
            <Icon name="chevronDown" size={13} className={cn("shrink-0 self-center text-muted transition-transform", open && "rotate-180")} />
          )}
        </button>
        <p className={cn("mt-0.5 text-[12px] leading-relaxed text-muted", p.status === "pending" && "opacity-60")}>{meta.blurb}</p>

        <AnimatePresence initial={false}>
          {open && hasBody && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="pt-2.5">
                <PhaseBody phase={p} />
                {steps.length > 0 && <SandboxSteps steps={steps} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, value]) => value !== "" && value != null && value !== false);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-black/[0.03] px-3 py-2.5 sm:grid-cols-3">
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10.5px] uppercase tracking-[0.08em] text-muted">{label}</dt>
          <dd className="truncate font-mono text-[12.5px] tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PhaseBody({ phase: p }: { phase: Phase }) {
  const f = p.facts;
  switch (p.key) {
    case "upload":
      return <Facts items={[["Size", f.size_bytes ? formatBytes(Number(f.size_bytes)) : ""], ["Stored in", "Private storage"]]} />;
    case "inspect": {
      const sheets = Array.isArray(f.sheets) ? (f.sheets as { name: string; rows: number; cols: number }[]) : [];
      const unitName = String(f.unit_name ?? "pages");
      return (
        <div className="space-y-2">
          <Facts
            items={[
              ["Type", f.file_type ? String(f.file_type).toUpperCase() : ""],
              [unitName.replace(/^\w/, (c) => c.toUpperCase()), f.units != null ? number(f.units) : ""],
              ["Characters", f.text_chars != null ? number(f.text_chars) : ""],
              ["Pages with tables", f.table_pages ? number(f.table_pages) : ""],
              ["Scanned pages", f.scanned_pages ? number(f.scanned_pages) : ""],
              ["Two-column pages", f.multi_column_pages ? number(f.multi_column_pages) : ""],
              ["Paragraphs", f.paragraphs ? number(f.paragraphs) : ""],
              ["Headings", f.headings ? number(f.headings) : ""],
              ["Tables", f.tables ? number(f.tables) : ""],
            ]}
          />
          {sheets.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {sheets.map((sheet) => (
                <li key={sheet.name} className="rounded-lg bg-black/[0.04] px-2 py-1 text-[11.5px]">
                  <span className="font-medium">{sheet.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {number(sheet.rows)} × {number(sheet.cols)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {Array.isArray(f.warnings) && f.warnings.length > 0 && (
            <p className="text-[11.5px] text-muted">Noted: {(f.warnings as string[]).map((w) => w.replace(/_/g, " ")).join(", ")}</p>
          )}
        </div>
      );
    }
    case "extract":
      return (
        <Facts
          items={[
            ["Method", f.method ? METHOD[String(f.method)] ?? String(f.method) : ""],
            ["Attempts", f.attempts ? number(f.attempts) : ""],
            ["Pages", f.pages != null ? number(f.pages) : ""],
            ["Characters", f.characters ? number(f.characters) : ""],
            ["Tables", f.tables ? number(f.tables) : ""],
            ["Headings", f.headings ? number(f.headings) : ""],
          ]}
        />
      );
    case "chunk":
      return (
        <div className="space-y-2">
          <Facts
            items={[
              ["Passages", f.chunks != null ? number(f.chunks) : ""],
              ["Average size", f.average_tokens ? `${number(f.average_tokens)} tokens` : ""],
              ["Range", f.largest_tokens ? `${number(f.smallest_tokens)}–${number(f.largest_tokens)}` : ""],
              ["Sections", f.sections ? number(f.sections) : ""],
            ]}
          />
          {typeof f.chunks === "number" && f.chunks > 0 && <PassageStrip count={f.chunks} />}
          {typeof f.sample === "string" && f.sample && (
            <figure className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
              <figcaption className="mb-1 text-[10.5px] uppercase tracking-[0.08em] text-muted">
                Passage 1 · {String(f.sample_label ?? "")}
              </figcaption>
              <p className="line-clamp-4 whitespace-pre-line font-mono text-[11.5px] leading-relaxed text-[rgb(var(--text))]/80">
                {f.sample}
              </p>
            </figure>
          )}
        </div>
      );
    case "embed": {
      const done = Number(f.done ?? 0);
      const planned = Number(f.planned ?? 0);
      return (
        <div className="space-y-2">
          <Facts
            items={[
              ["Mapped", planned ? `${number(done)} of ${number(planned)}` : ""],
              ["Numbers each", f.dimensions ? number(f.dimensions) : ""],
              ["Model", f.model ? String(f.model) : ""],
              [
                "Kept for keywords",
                typeof f.chunks === "number" && planned && f.chunks > planned ? plural(f.chunks - planned, "passage") : "",
              ],
            ]}
          />
          {planned > 0 && <EmbedGrid done={done} planned={planned} active={p.status === "active"} />}
          {Boolean(f.keyword_only) && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
              Today&apos;s free quota for this step ran out, so this file is searched by exact words for now. Answers still work.
            </p>
          )}
        </div>
      );
    }
    case "index":
      return (
        <Facts
          items={[
            ["Passages saved", f.rows != null ? number(f.rows) : ""],
            ["Found by", f.search ? String(f.search) : ""],
          ]}
        />
      );
    default:
      return null;
  }
}

/** One mark per passage (grouped for long documents), in reading order. */
function PassageStrip({ count }: { count: number }) {
  const marks = Math.min(count, 72);
  const per = Math.ceil(count / marks);
  return (
    <div aria-label={plural(count, "passage")} className="flex flex-wrap gap-[3px]">
      {Array.from({ length: Math.ceil(count / per) }, (_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: Math.min(i * 0.012, 0.6), duration: 0.25 }}
          className="h-3.5 w-[7px] rounded-[2px] bg-[rgb(var(--text))]/70"
        />
      ))}
      {per > 1 && <span className="ml-1 self-center text-[10.5px] text-muted">each mark ≈ {per} passages</span>}
    </div>
  );
}

/** The passages being mapped, filling in as batches come back. */
function EmbedGrid({ done, planned, active }: { done: number; planned: number; active: boolean }) {
  const cells = Math.min(planned, 96);
  const filled = Math.round((done / planned) * cells);
  return (
    <div className="flex flex-wrap gap-[3px]">
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-2 rounded-[2px] transition-colors duration-500",
            i < filled ? "bg-[rgb(var(--text))]" : "bg-black/[0.08]",
            active && i === filled && "animate-pulse bg-[rgb(var(--text))]/40",
          )}
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------------- sandbox
const STEP_TITLES: Record<LiveStep["kind"], string> = {
  probe: "Inspection script",
  extract: "Extraction script",
  note: "Note",
};

export function SandboxSteps({ steps }: { steps: LiveStep[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {steps.map((step, index) =>
        step.kind === "note" ? (
          <li key={index} className="rounded-xl bg-black/[0.04] px-3 py-2 text-[12px] text-[rgb(var(--text))]/75">
            {step.output}
          </li>
        ) : (
          <li key={index} className="overflow-hidden rounded-xl border border-black/[0.06] bg-[#141414]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5 font-mono text-[11px] text-zinc-400">
              <span className="flex items-center gap-2">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                </span>
                {STEP_TITLES[step.kind]}
                {step.kind === "extract" ? ` · attempt ${step.attempt}` : ""}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  step.status === "success" && "text-emerald-400",
                  step.status === "failed" && "text-red-400",
                )}
              >
                {step.status === "running" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-300" />}
                {step.status === "running" ? "running" : step.status === "success" ? "passed" : "failed"}
                {step.started_at && step.ended_at ? ` · ${duration(step.ended_at - step.started_at)}` : ""}
              </span>
            </div>
            <pre className="max-h-44 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">
              {step.code.trim()}
            </pre>
            {step.output && (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap border-t border-white/[0.06] bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400">
                <span className="select-none text-zinc-600">$ </span>
                {step.output.trim()}
              </pre>
            )}
          </li>
        ),
      )}
    </ol>
  );
}
