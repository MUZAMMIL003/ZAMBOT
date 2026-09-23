/**
 * The right-hand panel of a conversation - the "canvas" for documents.
 *
 *   Document tab : one page of the document, the cited passage highlighted
 *   Sources tab  : every document in the chat, switch each on/off for answers,
 *                  add more, remove, retry
 *
 * xl and up it docks beside the thread; lg slides it over from the right;
 * phones get a bottom sheet. It opens from a citation, a source card, a key
 * fact, a document chip, or the Sources button in the header.
 *
 * The real app will render the original PDF with PDF.js (free, Apache-2.0) and
 * highlight the chunk's text; the demo draws the page from stored passages.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { DocumentPage, DocumentRecord } from "@/lib/types";
import { ACCEPTED_EXTENSIONS, cn, fileLabel, formatBytes, truncate } from "@/lib/utils";

export interface PanelFocus {
  documentId: string;
  page: number;
  /** The passage to highlight, when opened from a citation. */
  snippet?: string | null;
}

export type PanelTab = "document" | "sources";

const PROCESSING = ["uploaded", "extracting", "analyzing"];

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

interface PanelProps {
  open: boolean;
  onClose: () => void;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  documents: DocumentRecord[];
  focus: PanelFocus | null;
  onFocus: (focus: PanelFocus) => void;
  excluded: Set<string>;
  onToggleIncluded: (documentId: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemove: (documentId: string) => void;
  onRetry: (documentId: string) => void;
}

export function DocumentPanel(props: PanelProps) {
  const { open, onClose } = props;
  const docked = useMedia("(min-width: 1280px)");
  const wide = useMedia("(min-width: 1024px)");

  useEffect(() => {
    if (!open || docked) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, docked, onClose]);

  if (docked) {
    return (
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            aria-label="Documents"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 460, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 h-full shrink-0 overflow-hidden border-l border-white/50 bg-white/35 backdrop-blur-[20px]"
          >
            <div className="flex h-full w-[460px] flex-col">
              <PanelBody {...props} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close documents"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Documents"
            initial={wide ? { x: "100%" } : { y: "100%" }}
            animate={wide ? { x: 0 } : { y: 0 }}
            exit={wide ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className={cn(
              "absolute flex flex-col bg-[#F5F2F8]/95 shadow-lifted backdrop-blur-xl",
              wide
                ? "inset-y-0 right-0 w-[460px]"
                : "inset-x-0 bottom-0 h-[88dvh] rounded-t-[28px] safe-b",
            )}
          >
            {!wide && (
              <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-black/15" />
            )}
            <PanelBody {...props} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function PanelBody(props: PanelProps) {
  const { tab, onTab, onClose, documents } = props;
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-4 lg:pt-6">
        <div role="tablist" aria-label="Panel" className="flex flex-1 rounded-full bg-black/5 p-1">
          {(["document", "sources"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => onTab(key)}
              className={cn(
                "h-8 flex-1 rounded-full text-[13px] font-medium transition-colors",
                tab === key ? "bg-white text-[rgb(var(--text))] shadow-sm" : "text-[rgb(var(--text))]/60 hover:text-[rgb(var(--text))]",
              )}
            >
              {key === "document" ? "Document" : `Sources (${documents.length})`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 shadow-sm hover:bg-white"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {tab === "document" ? <DocumentView {...props} /> : <SourcesView {...props} />}
    </>
  );
}

// ------------------------------------------------------------- document tab
function DocumentView({ documents, focus, onFocus, onTab }: PanelProps) {
  const ready = documents.filter((d) => d.status === "ready");
  const current = ready.find((d) => d.id === focus?.documentId) ?? ready[0];
  const pageNumber = focus && current && focus.documentId === current.id ? focus.page : 1;
  const snippet = focus && current && focus.documentId === current.id ? focus.snippet : null;

  const [page, setPage] = useState<DocumentPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, DocumentPage>());
  const mark = useRef<HTMLParagraphElement>(null);

  const currentId = current?.id;
  useEffect(() => {
    if (!currentId) return;
    const key = `${currentId}:${pageNumber}`;
    const cached = cache.current.get(key);
    if (cached) {
      setPage(cached);
      setFailed(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    api
      .documentPage(currentId, pageNumber)
      .then((result) => {
        cache.current.set(key, result);
        if (!cancelled) setPage(result);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [currentId, pageNumber]);

  // Bring the highlighted passage into view once the page has drawn.
  useEffect(() => {
    if (page && snippet) mark.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [page, snippet]);

  if (!current) {
    return (
      <div className="grid flex-1 place-items-center px-8 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/80 text-muted">
            <Icon name="file" size={20} />
          </span>
          <p className="mt-3 text-[14px] font-medium">Nothing to show yet</p>
          <p className="mt-1 text-[13px] text-muted">
            Documents appear here once they have been read.
          </p>
          <button
            type="button"
            onClick={() => onTab("sources")}
            className="mt-4 text-[13px] font-medium underline underline-offset-2"
          >
            Go to Sources
          </button>
        </div>
      </div>
    );
  }

  const total = Math.max(1, current.page_count);
  const go = (next: number) =>
    onFocus({ documentId: current.id, page: Math.min(Math.max(1, next), total) });

  const openOriginal = async () => {
    try {
      const { url } = await api.downloadUrl(current.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* nothing useful to show */
    }
  };

  const highlighted = (text: string) =>
    Boolean(snippet) && (text === snippet || text.includes(snippet!) || snippet!.includes(text));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {ready.length > 1 && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-3">
          {ready.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => onFocus({ documentId: document.id, page: 1 })}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                document.id === current.id ? "bg-[rgb(var(--accent))] text-white" : "bg-white/70 hover:bg-white",
              )}
            >
              {truncate(document.filename, 26)}
            </button>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 px-4 pb-3">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={current.filename}>
          {current.filename}
        </span>
        <div className="flex items-center rounded-full bg-white/70 shadow-sm">
          <button
            type="button"
            onClick={() => go(pageNumber - 1)}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded-full disabled:opacity-30"
          >
            <Icon name="arrowLeft" size={14} />
          </button>
          <span className="min-w-[88px] text-center text-[12.5px] tabular-nums">
            Page {pageNumber} of {total}
          </span>
          <button
            type="button"
            onClick={() => go(pageNumber + 1)}
            disabled={pageNumber >= total}
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-full disabled:opacity-30"
          >
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void openOriginal()}
          aria-label="Open the original file"
          title="Open the original file"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 shadow-sm hover:bg-white"
        >
          <Icon name="arrowUpRight" size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <article className="min-h-[420px] rounded-xl bg-white px-6 py-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          {loading || (!page && !failed) ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : failed || !page ? (
            <div className="py-10 text-center">
              <p className="text-[14px] font-medium">Preview not available</p>
              <p className="mt-1 text-[13px] text-muted">You can still open the original file.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[10.5px] font-medium uppercase tracking-wider text-muted">
                {page.filename} · page {page.page}
              </p>
              {page.heading && (
                <h3 className="mb-4 text-[17px] font-semibold leading-snug tracking-tight">{page.heading}</h3>
              )}
              <div className="space-y-4">
                {page.blocks.map((block, index) =>
                  block.text ? (
                    <p
                      key={index}
                      ref={highlighted(block.text) ? mark : undefined}
                      className={cn(
                        "text-[13.5px] leading-[1.7] text-[rgb(var(--text))]/85",
                        highlighted(block.text) &&
                          "-mx-2 rounded-md bg-[#FFF1A8] px-2 py-1 text-[rgb(var(--text))] shadow-[inset_3px_0_0_#E8C547]",
                      )}
                    >
                      {block.text}
                    </p>
                  ) : (
                    <div key={index} aria-hidden className="space-y-2 py-0.5">
                      {[100, 96, 88, 60].map((width, i) => (
                        <div key={i} className="h-2 rounded-full bg-black/[0.06]" style={{ width: `${width - (index % 3) * 4}%` }} />
                      ))}
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </article>
        {snippet && page && (
          <p className="mt-3 flex items-center gap-2 px-1 text-[12px] text-muted">
            <span className="h-3 w-3 rounded-sm bg-[#FFF1A8] shadow-[inset_2px_0_0_#E8C547]" />
            Highlighted: the passage the answer quotes
          </p>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- sources tab
function SourcesView({
  documents,
  excluded,
  onToggleIncluded,
  onAddFiles,
  onRemove,
  onRetry,
  onFocus,
  onTab,
}: PanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const onCount = documents.filter((d) => d.status === "ready" && !excluded.has(d.id)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 px-5 pb-3 text-[12.5px] text-muted">
        {onCount} of {documents.length} used for answers. Switch a document off to leave it out.
      </p>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {documents.map((document) => {
          const processing = PROCESSING.includes(document.status);
          const ready = document.status === "ready";
          const on = ready && !excluded.has(document.id);
          const armed = confirming === document.id;
          return (
            <li
              key={document.id}
              className={cn(
                "rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm transition-opacity",
                ready && !on && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    onFocus({ documentId: document.id, page: 1 });
                    onTab("document");
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                >
                  <span className="grid h-10 min-w-[40px] place-items-center rounded-xl bg-[rgb(var(--accent))] px-1 text-[10px] font-bold text-white">
                    {fileLabel(document.extension)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{document.filename}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {ready
                        ? `${document.page_count} page${document.page_count === 1 ? "" : "s"} · ${formatBytes(document.size_bytes)}`
                        : document.status_detail || document.status_label}
                    </span>
                  </span>
                </button>

                {ready && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Use ${document.filename} in answers`}
                    onClick={() => onToggleIncluded(document.id)}
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      on ? "bg-[rgb(var(--accent))]" : "bg-black/15",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        on ? "translate-x-[18px]" : "translate-x-0.5",
                      )}
                    />
                  </button>
                )}
              </div>

              {processing && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-[rgb(var(--accent))] transition-all duration-700"
                    style={{ width: document.status === "uploaded" ? "12%" : document.status === "extracting" ? "45%" : "80%" }}
                  />
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-1">
                {document.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => onRetry(document.id)}
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium hover:bg-black/5"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (armed) {
                      setConfirming(null);
                      onRemove(document.id);
                    } else {
                      setConfirming(document.id);
                    }
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                    armed ? "bg-danger/15 text-danger" : "text-[rgb(var(--text))]/55 hover:bg-danger/10 hover:text-danger",
                  )}
                >
                  {armed ? "Tap again to remove" : "Remove"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 px-4 pb-5 pt-1">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            if (files.length) onAddFiles(files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-dashed border-black/20 bg-white/50 text-[13.5px] font-medium transition hover:bg-white"
        >
          <Icon name="plus" size={16} />
          Add documents
        </button>
      </div>
    </div>
  );
}
