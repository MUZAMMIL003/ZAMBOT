/**
 * The card at the top of every conversation. It is the chat's "front page":
 *
 *   no documents : what to do (attach one)
 *   reading      : each file's journey, step by step - inspect, extract, split,
 *                  map the meaning, file it away - with the sandbox code as it
 *                  runs, and a promise that a question typed now will be
 *                  answered when reading finishes
 *   failed       : where it broke and why, with a Retry button
 *   ready        : the brief - a short summary, key facts that open the page
 *                  they came from, starter questions, and how each file was read
 *
 * Once the conversation is under way it folds down to one line.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { PixelMark } from "@/components/ui/PixelMark";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DocumentBrief, DocumentRecord, KeyFact } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";
import { modeOf, percentOf, phasesOf, readSummary } from "@/lib/pipeline";
import { ReadingPipeline } from "./ReadingPipeline";

export { SandboxSteps } from "./ReadingPipeline";

const EASE = [0.22, 1, 0.36, 1] as const;
const FAILED = ["failed", "manual_review"];
const PROCESSING = ["uploaded", "extracting", "analyzing"];

export function BriefCard({
  documents,
  uploading = [],
  brief,
  hasMessages,
  onAsk,
  onOpenFact,
  onOpenSources,
  onRetry,
}: {
  documents: DocumentRecord[];
  uploading?: { name: string; extension: string }[];
  brief: DocumentBrief | null;
  hasMessages: boolean;
  onAsk: (question: string) => void;
  onOpenFact: (fact: KeyFact) => void;
  onOpenSources: () => void;
  onRetry: (documentId: string) => void;
}) {
  const processing = documents.filter((d) => PROCESSING.includes(d.status));
  const ready = documents.filter((d) => d.status === "ready");
  const failed = documents.filter((d) => FAILED.includes(d.status));
  const [expanded, setExpanded] = useState(!hasMessages);

  // Fold away once the first question is asked.
  useEffect(() => {
    if (hasMessages) setExpanded(false);
  }, [hasMessages]);

  if (documents.length === 0 && uploading.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex flex-col items-center py-8 text-center"
      >
        <span className="grid h-24 w-24 place-items-center rounded-[28px] bg-white/70 shadow-sm ring-1 ring-black/[0.05]">
          <PixelMark mode="idle" size={56} />
        </span>
        <h2 className="mt-6 text-[19px] font-semibold tracking-tight">Add a document to begin</h2>
        <p className="mx-auto mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-muted">
          Attach a file with the paperclip below, or drop it anywhere on this page. Answers come only
          from what you upload.
        </p>
      </motion.div>
    );
  }

  if (processing.length > 0 || uploading.length > 0) {
    const count = processing.length + uploading.length;
    const lead = processing[0];
    const mode = lead ? modeOf(phasesOf(lead)) : "index";
    const percent = processing.length
      ? Math.round(processing.reduce((sum, d) => sum + percentOf(phasesOf(d)), 0) / processing.length)
      : 2;
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur-md sm:p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-3.5">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[rgb(var(--text))] shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
            <PixelMark mode={mode} size={40} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight">
              {processing.length === 0 ? "Uploading" : "Reading"} {count === 1 ? "your document" : `${count} documents`}
            </h2>
            <p className="text-[12.5px] text-muted">Ask your question now. The answer arrives as soon as reading finishes.</p>
          </div>
          <span className="shrink-0 font-mono text-[20px] font-medium tabular-nums tracking-tight">{percent}%</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {documents.map((document, index) => (
            <li key={document.id}>
              <ReadingPipeline document={document} onRetry={onRetry} defaultOpen={index === 0} />
            </li>
          ))}
          {uploading.map((file) => (
            <li key={file.name}>
              <UploadingRow name={file.name} extension={file.extension} />
            </li>
          ))}
        </ul>
      </motion.section>
    );
  }

  if (ready.length === 0 && failed.length > 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] border border-danger/25 bg-white/60 p-4 shadow-sm backdrop-blur-md sm:p-5"
        role="alert"
      >
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-danger/20">
            <PixelMark mode="error" size={28} className="text-danger" />
          </span>
          <div>
            <h2 className="text-[15.5px] font-semibold tracking-tight">
              {failed.length === 1 ? "This document could not be read" : "These documents could not be read"}
            </h2>
            <p className="text-[12.5px] text-muted">Open the steps to see where it stopped, then retry or attach a different file.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {failed.map((document) => (
            <li key={document.id}>
              <ReadingPipeline document={document} onRetry={onRetry} defaultOpen={failed.length === 1} />
            </li>
          ))}
        </ul>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="overflow-hidden rounded-[24px] border border-white/60 bg-white/55 shadow-sm backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[rgb(var(--text))]/80 shadow-sm ring-1 ring-black/5">
          <Icon name="book" size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold">Document brief</span>
          <span className="block truncate text-[12px] text-muted">
            {ready.map((d) => truncate(d.filename, 28)).join(" · ")}
          </span>
        </span>
        <Icon name="chevronDown" size={16} className={cn("shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <div className="border-t border-white/60 px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
              {failed.length > 0 && (
                <ul className="mb-4 space-y-2.5">
                  {failed.map((document) => (
                    <li key={document.id}>
                      <ReadingPipeline document={document} onRetry={onRetry} />
                    </li>
                  ))}
                </ul>
              )}
              {!brief ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="mt-3 h-14 w-full rounded-xl" />
                </div>
              ) : (
                <>
                  <p className="text-[14px] leading-relaxed text-[rgb(var(--text))]/85">{brief.summary}</p>

                  {brief.key_facts.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wider text-muted">Key facts</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {brief.key_facts.map((fact) => (
                          <button
                            key={`${fact.label}-${fact.value}`}
                            type="button"
                            onClick={() => onOpenFact(fact)}
                            title={fact.page ? `Open page ${fact.page}` : "Open document"}
                            className="group rounded-xl border border-black/5 bg-white/80 px-3 py-2.5 text-left transition hover:bg-white hover:shadow-sm"
                          >
                            <span className="block truncate text-[11.5px] text-muted">{fact.label}</span>
                            <span className="block truncate text-[14px] font-semibold tabular-nums">{fact.value}</span>
                            {fact.page != null && (
                              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted group-hover:text-[rgb(var(--text))]">
                                Page {fact.page}
                                <Icon name="arrowUpRight" size={11} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasMessages && brief.questions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wider text-muted">Start with</p>
                      <div className="flex flex-col gap-1.5">
                        {brief.questions.map((question, index) => (
                          <motion.button
                            key={question}
                            type="button"
                            onClick={() => onAsk(question)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 + index * 0.05 }}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-left text-[13.5px] transition hover:bg-white hover:shadow-sm"
                          >
                            {question}
                            <Icon name="arrowRight" size={14} className="shrink-0 text-muted" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onOpenSources}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[rgb(var(--text))]/60 hover:text-[rgb(var(--text))]"
                  >
                    <Icon name="files" size={14} />
                    Manage sources
                  </button>
                </>
              )}
              <HowItWasRead documents={ready} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/** Before the server has a record for the file: only the upload step is moving. */
function UploadingRow({ name, extension }: { name: string; extension: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3.5 py-3 ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-3">
        <FileTypeIcon extension={extension} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{name}</span>
        <span className="shrink-0 font-mono text-[11.5px] text-muted">sending…</span>
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {[5, 15, 30, 10, 30, 10].map((weight, index) => (
          <span key={index} className="relative h-[5px] overflow-hidden rounded-full bg-black/[0.07]" style={{ flex: weight }}>
            {index === 0 && (
              <span className="absolute inset-0 animate-[pipeline-sheen_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(var(--text)),transparent)]" />
            )}
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2.5">
        <PixelMark mode="index" size={16} />
        <span className="text-[12.5px] font-medium">Uploading</span>
        <span className="text-[12.5px] text-muted">· sending the file to private storage</span>
      </div>
    </div>
  );
}

function ReadLine({ document, open, onToggle }: { document: DocumentRecord; open: boolean; onToggle: () => void }) {
  const summary = readSummary(document);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/80",
        open && "bg-white/80",
      )}
    >
      <PixelMark mode="done" size={16} />
      <span className="min-w-0 flex-1 truncate text-[12.5px]">
        <span className="font-medium">{truncate(document.filename, 34)}</span>
        <span className="text-muted"> · {summary}</span>
      </span>
      <span className="shrink-0 text-[12px] font-medium text-[rgb(var(--text))]/60">{open ? "Hide steps" : "See the steps"}</span>
    </button>
  );
}

/** Under the brief: how each file was read, one line each, opening into the full journey. */
function HowItWasRead({ documents }: { documents: DocumentRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!documents.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wider text-muted">How it was read</p>
      <ul className="space-y-1">
        {documents.map((document) => (
          <li key={document.id}>
            <ReadLine
              document={document}
              open={openId === document.id}
              onToggle={() => setOpenId((current) => (current === document.id ? null : document.id))}
            />
            <AnimatePresence initial={false}>
              {openId === document.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="overflow-hidden"
                >
                  <ReadingPipeline document={document} defaultOpen className="mt-1.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </div>
  );
}
