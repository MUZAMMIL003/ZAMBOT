/**
 * The card at the top of every conversation. It is the chat's "front page":
 *
 *   no documents : what to do (attach one)
 *   reading      : per-file progress, the extraction sandbox's code and output
 *                  as it runs, and a promise that a question typed now will be
 *                  answered when reading finishes
 *   failed       : why each file could not be read, with a Retry button
 *   ready        : the brief - a short summary, key facts that open the page
 *                  they came from, and starter questions
 *
 * Once the conversation is under way it folds down to one line.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { Orb } from "@/components/ui/Orb";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DocumentBrief, DocumentRecord, KeyFact, LiveStep } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const PROGRESS: Record<string, number> = { uploaded: 8, extracting: 40, analyzing: 75, ready: 100 };
const STAGE_PROGRESS: Record<string, number> = {
  "Inspecting document": 18,
  "Running saved recipe": 35,
  "Writing extraction code": 32,
  "Running in sandbox": 48,
  "Checking result": 58,
  "Splitting into chunks": 68,
  "Creating embeddings": 80,
  "Waiting for embedding quota…": 80,
  "Saving to knowledge base": 92,
};
const FAILED = ["failed", "manual_review"];
const PROCESSING = ["uploaded", "extracting", "analyzing"];

function progressOf(document: DocumentRecord): number {
  return STAGE_PROGRESS[document.status_label ?? ""] ?? PROGRESS[document.status] ?? 100;
}

function stageText(document: DocumentRecord): string {
  if (document.status === "ready") return "Ready";
  const label = document.status_label || document.status;
  return document.status_detail && document.status_detail !== label ? `${label} · ${document.status_detail}` : label;
}

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
        <Orb size={120} />
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
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur-md sm:p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <Orb size={40} />
          <div>
            <h2 className="text-[15px] font-semibold">
              {processing.length === 0 ? "Uploading" : "Reading"} {count} document{count === 1 ? "" : "s"}…
            </h2>
            <p className="text-[12.5px] text-muted">
              Ask your question now - I will answer as soon as this finishes.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-4">
          {documents.map((document) => (
            <DocumentProgress key={document.id} document={document} onRetry={onRetry} />
          ))}
          {uploading.map((file) => (
            <li key={file.name} className="flex items-center gap-3">
              <FileTypeIcon extension={file.extension} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium">{file.name}</span>
                  <span className="shrink-0 text-[11.5px] text-muted">Uploading…</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-black/5">
                  <span className="block h-full w-1/3 animate-pulse rounded-full bg-[rgb(var(--text))]/35" />
                </span>
              </span>
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
        <h2 className="text-[15px] font-semibold">
          {failed.length === 1 ? "This document could not be read" : "These documents could not be read"}
        </h2>
        <p className="mt-0.5 text-[12.5px] text-muted">Retry, or attach a different file with the paperclip below.</p>
        <ul className="mt-4 space-y-4">
          {failed.map((document) => (
            <DocumentProgress key={document.id} document={document} onRetry={onRetry} />
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[rgb(var(--text))]/80 shadow-sm ring-1 ring-black/5">
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
                <ul className="mb-4 space-y-3 rounded-2xl border border-danger/20 bg-danger/[0.04] p-3">
                  {failed.map((document) => (
                    <DocumentProgress key={document.id} document={document} onRetry={onRetry} />
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}


function DocumentProgress({ document, onRetry }: { document: DocumentRecord; onRetry: (id: string) => void }) {
  const failed = FAILED.includes(document.status);
  const running = PROCESSING.includes(document.status);
  const steps = document.live?.steps ?? [];
  const [open, setOpen] = useState(false);

  return (
    <li>
      <div className="flex items-center gap-3">
        <FileTypeIcon extension={document.extension} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium">{document.filename}</span>
            <span className={cn("shrink-0 text-[11.5px]", failed ? "text-danger" : "text-muted")}>
              {failed ? (document.status === "manual_review" ? "Needs review" : "Failed") : stageText(document)}
            </span>
          </span>
          {!failed && (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-black/5">
              <motion.span
                className="block h-full rounded-full bg-[rgb(var(--text))]/55"
                initial={false}
                animate={{ width: `${progressOf(document)}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </span>
          )}
        </span>
      </div>

      {failed && (
        <div className="mt-2 flex items-start gap-3 pl-11">
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[rgb(var(--text))]/75">
            {document.error || "This document could not be processed."}
          </p>
          <button
            type="button"
            onClick={() => onRetry(document.id)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-medium shadow-sm ring-1 ring-black/10 hover:bg-black/[0.03]"
          >
            <Icon name="refresh" size={13} />
            Retry
          </button>
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-2 pl-11">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text))]/60 hover:text-[rgb(var(--text))]"
          >
            <Icon name="code" size={13} />
            {open ? "Hide sandbox" : running ? "Watch the sandbox" : "Show sandbox"}
            <span className="text-muted">· {steps.filter((step) => step.kind !== "note").length} runs</span>
            <Icon name="chevronDown" size={13} className={cn("transition-transform", open && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <SandboxSteps steps={steps} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </li>
  );
}

const STEP_TITLES: Record<LiveStep["kind"], string> = {
  probe: "Inspecting the file",
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
          <li key={index} className="overflow-hidden rounded-xl border border-black/5">
            <div className="flex items-center justify-between gap-2 bg-white/80 px-3 py-1.5 text-[11.5px]">
              <span className="font-medium">
                {STEP_TITLES[step.kind]}
                {step.kind === "extract" ? ` · attempt ${step.attempt}` : ""}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  step.status === "success" && "text-emerald-700",
                  step.status === "failed" && "text-danger",
                  step.status === "running" && "text-muted",
                )}
              >
                {step.status === "running" && (
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
                )}
                {step.status === "running" ? "Running" : step.status === "success" ? "Passed" : "Failed"}
              </span>
            </div>
            <pre className="max-h-40 overflow-auto bg-[#1e1e1e] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">
              {step.code.trim()}
            </pre>
            {step.output && (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap bg-[#0d0d0d] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400">
                {step.output.trim()}
              </pre>
            )}
          </li>
        ),
      )}
    </ol>
  );
}
