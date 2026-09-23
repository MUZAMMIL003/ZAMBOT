/**
 * The card at the top of every conversation. It is the chat's "front page":
 *
 *   no documents : what to do (attach one)
 *   reading      : per-file progress, and a promise that a question typed now
 *                  will be answered when reading finishes
 *   ready        : the brief - a short summary, key facts that open the page
 *                  they came from, and starter questions
 *
 * Once the conversation is under way it folds down to one line.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Orb } from "@/components/ui/Orb";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DocumentBrief, DocumentRecord, KeyFact } from "@/lib/types";
import { cn, fileLabel, truncate } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const PROGRESS: Record<string, number> = { uploaded: 10, extracting: 45, analyzing: 80, ready: 100 };

export function BriefCard({
  documents,
  brief,
  hasMessages,
  onAsk,
  onOpenFact,
  onOpenSources,
}: {
  documents: DocumentRecord[];
  brief: DocumentBrief | null;
  hasMessages: boolean;
  onAsk: (question: string) => void;
  onOpenFact: (fact: KeyFact) => void;
  onOpenSources: () => void;
}) {
  const processing = documents.filter((d) => ["uploaded", "extracting", "analyzing"].includes(d.status));
  const ready = documents.filter((d) => d.status === "ready");
  const [expanded, setExpanded] = useState(!hasMessages);

  // Fold away once the first question is asked.
  useEffect(() => {
    if (hasMessages) setExpanded(false);
  }, [hasMessages]);

  if (documents.length === 0) {
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

  if (processing.length > 0) {
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
              Reading {processing.length} document{processing.length === 1 ? "" : "s"}…
            </h2>
            <p className="text-[12.5px] text-muted">
              Ask your question now - I will answer as soon as this finishes.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3">
              <span className="grid h-8 min-w-[34px] place-items-center rounded-lg bg-[rgb(var(--accent))] px-1 text-[9.5px] font-bold text-white">
                {fileLabel(document.extension)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium">{document.filename}</span>
                  <span className="shrink-0 text-[11.5px] text-muted">
                    {document.status === "ready" ? "Ready" : document.status_detail || document.status_label}
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-black/5">
                  <motion.span
                    className="block h-full rounded-full bg-[rgb(var(--accent))]"
                    initial={false}
                    animate={{ width: `${PROGRESS[document.status] ?? 100}%` }}
                    transition={{ duration: 0.8, ease: EASE }}
                  />
                </span>
              </span>
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent))] text-white">
          <Icon name="sparkle" size={16} />
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
                    <Icon name="layers" size={13} />
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
