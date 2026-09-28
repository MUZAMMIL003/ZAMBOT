/**
 * What happened between the question and the answer.
 *
 *   LiveAnswerSteps : while the answer is being prepared - the step running
 *                     now (a moving ring and a shimmering line) and every
 *                     finished step, each of which opens to show its inner work
 *   AnswerTrace     : kept on every answer as one quiet line ("Found in 6
 *                     steps · 8.4s") that opens into the same timeline
 *
 * Opening a step shows what went on in the background: the messages it
 * looked back on, how the question was reworded, the calculation code, the
 * passages the search found and why, the score each passage got, what was
 * sent to the writing model and what the checker concluded - with the model
 * that did each job.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { Working } from "@/components/ui/Working";
import { toPlainText } from "@/lib/markdown";
import { describe, duration, plural, titleOf } from "@/lib/pipeline";
import type { SandboxRun, TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Passage = { file?: string; where?: string; matched_by?: string[]; score?: number | null; text?: string; kept?: boolean };
type Served = { provider?: string; model?: string } | null | undefined;

function useElapsed(running: boolean): number {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [running]);
  return now - start;
}

// ------------------------------------------------------------ small parts
function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">{children}</p>;
}

function Model({ served }: { served: Served }) {
  if (!served?.model) return null;
  const name = served.model.replace(/^openai\//, "");
  const host = served.provider === "gemini" ? "Google" : "Groq";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[10.5px] text-[rgb(var(--text))]/70">
      <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--text))]/50" />
      {name} · {host}
    </span>
  );
}

const MATCH: Record<string, string> = { vector: "meaning", keyword: "words", original: "your words", calculation: "calculation" };

function Matches({ by }: { by?: string[] }) {
  if (!by?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {by.map((kind) => (
        <span key={kind} className="rounded-[5px] bg-black/[0.05] px-1.5 py-[1px] text-[10px] font-medium text-[rgb(var(--text))]/65">
          {MATCH[kind] ?? kind}
        </span>
      ))}
    </span>
  );
}

function PassageRow({ passage, index, scoreOutOf }: { passage: Passage; index: number; scoreOutOf?: number }) {
  const score = passage.score ?? null;
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2",
        passage.kept === false ? "border-black/[0.04] bg-white/40 opacity-60" : "border-black/[0.06] bg-white",
      )}
    >
      <div className="flex items-center gap-2 text-[11.5px]">
        <span className="font-mono text-muted">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {passage.file}
          {passage.where ? <span className="font-normal text-muted"> · {passage.where}</span> : null}
        </span>
        <Matches by={passage.matched_by} />
        {scoreOutOf && score != null ? (
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-black/[0.08]">
              <span
                className={cn("block h-full rounded-full", passage.kept === false ? "bg-black/30" : "bg-[rgb(var(--text))]")}
                style={{ width: `${Math.min(100, (score / scoreOutOf) * 100)}%` }}
              />
            </span>
            <span className="w-7 text-right font-mono tabular-nums">{score.toFixed(score % 1 ? 1 : 0)}</span>
          </span>
        ) : null}
        {passage.kept != null && (
          <span className={cn("shrink-0 text-[10.5px] font-medium", passage.kept ? "text-emerald-700" : "text-muted")}>
            {passage.kept ? "kept" : "dropped"}
          </span>
        )}
      </div>
      {passage.text && <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[rgb(var(--text))]/65">{passage.text}</p>}
    </li>
  );
}

function Terminal({ run, index }: { run: SandboxRun; index: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#141414]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 font-mono text-[10.5px] text-zinc-400">
        <span>calculation.py · try {index + 1}</span>
        <span className={cn(run.status === "success" ? "text-emerald-400" : run.status === "error" ? "text-red-400" : "text-zinc-300")}>
          {run.status === "success" ? "passed" : run.status === "error" ? "failed" : "running"}
        </span>
      </div>
      <pre className="max-h-44 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">{run.code.trim()}</pre>
      {run.output && (
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap border-t border-white/[0.06] bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400">
          <span className="select-none text-zinc-600">$ </span>
          {run.output.trim()}
        </pre>
      )}
    </div>
  );
}

// ------------------------------------------------------------- details
function hasDetails(step: TraceStep, runs?: SandboxRun[] | null): boolean {
  const f = step.facts ?? {};
  switch (step.stage) {
    case "remembering":
      return Array.isArray(f.recent) && f.recent.length > 0;
    case "rewriting":
      return Boolean(f.original || f.question);
    case "sandbox":
      return Boolean(runs?.length);
    case "retrieving":
    case "ranking":
      return Array.isArray(f.passages) && f.passages.length > 0;
    case "generating":
      return Array.isArray(f.context) && f.context.length > 0;
    case "verifying":
      return Boolean(f.sources || f.note || f.served);
    default:
      return false;
  }
}

function StepDetails({ step, runs }: { step: TraceStep; runs?: SandboxRun[] | null }) {
  const f = step.facts ?? {};
  const served = f.served as Served;
  switch (step.stage) {
    case "remembering": {
      const recent = (f.recent as { role: string; text: string }[]) ?? [];
      return (
        <div className="space-y-2.5">
          <div>
            <Label>Messages it looked back on</Label>
            <ul className="space-y-1">
              {recent.map((turn, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed">
                  <span className="w-11 shrink-0 font-medium text-muted">{turn.role === "user" ? "You" : "Zambot"}</span>
                  <span className="min-w-0 flex-1 text-[rgb(var(--text))]/75">{toPlainText(turn.text)}</span>
                </li>
              ))}
            </ul>
          </div>
          {typeof f.summary === "string" && f.summary && (
            <div>
              <Label>Running summary of older messages</Label>
              <p className="text-[12px] leading-relaxed text-[rgb(var(--text))]/75">{f.summary}</p>
            </div>
          )}
        </div>
      );
    }
    case "rewriting":
      return (
        <div className="space-y-2">
          <div className={cn("grid gap-2", Boolean(f.changed) && "sm:grid-cols-2")}>
            {Boolean(f.changed) && (
              <div className="rounded-xl bg-white px-3 py-2">
                <Label>You asked</Label>
                <p className="text-[12.5px] leading-relaxed">{String(f.original ?? "")}</p>
              </div>
            )}
            <div className="rounded-xl bg-[rgb(var(--text))] px-3 py-2 text-white">
              <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/55">It searched for</p>
              <p className="text-[12.5px] leading-relaxed">{String(f.question ?? "")}</p>
            </div>
          </div>
          <p className="text-[11.5px] text-muted">
            {f.changed
              ? "Rewritten into a question that stands on its own, using the conversation so far. Your own words were searched too."
              : "Already clear on its own, so it was searched as written."}{" "}
            <Model served={served} />
          </p>
        </div>
      );
    case "sandbox":
      return (
        <div className="space-y-2">
          <p className="text-[11.5px] text-muted">
            Python ran in a sealed sandbox against every row of the sheet. Failed tries are fixed and run again.
          </p>
          {(runs ?? []).map((run, i) => (
            <Terminal key={i} run={run} index={i} />
          ))}
        </div>
      );
    case "retrieving": {
      const words = (f.words as string[]) ?? [];
      return (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/[0.06]">
              By meaning <b className="font-mono">{Number(f.by_meaning ?? 0)}</b>
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/[0.06]">
              By exact words <b className="font-mono">{Number(f.by_keyword ?? 0)}</b>
            </span>
            {Number(f.recalled ?? 0) > 0 && (
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-black/[0.06]">
                Earlier answers <b className="font-mono">{Number(f.recalled)}</b>
              </span>
            )}
          </div>
          {words.length > 0 && (
            <div>
              <Label>Words it looked for</Label>
              <div className="flex flex-wrap gap-1">
                {words.map((word) => (
                  <span key={word} className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11px]">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Best matches, in order</Label>
            <ol className="space-y-1.5">
              {((f.passages as Passage[]) ?? []).map((passage, i) => (
                <PassageRow key={i} passage={passage} index={i} />
              ))}
            </ol>
          </div>
        </div>
      );
    }
    case "ranking":
      return (
        <div className="space-y-2">
          <p className="text-[11.5px] text-muted">
            {f.scored
              ? `Each passage was scored 0–10 for how directly it answers the question. Passages scoring ${Number(f.threshold ?? 4)} or more are kept.`
              : "Scoring was not available, so the search order was used."}{" "}
            <Model served={served} />
          </p>
          {f.kind === "analysis" && (
            <p className="rounded-lg bg-white px-2.5 py-2 text-[11.5px] leading-relaxed">
              {Number(f.whole) > 0
                ? `This asks for a judgement, not a single fact, so the whole document (${Number(f.whole)} passages) was given to the writer to weigh up.`
                : "This asks for a judgement, not a single fact, so the most useful passages were kept even where none states the answer outright."}
            </p>
          )}
          <ol className="space-y-1.5">
            {((f.passages as Passage[]) ?? []).map((passage, i) => (
              <PassageRow key={i} passage={passage} index={i} scoreOutOf={f.scored ? 10 : undefined} />
            ))}
          </ol>
        </div>
      );
    case "generating": {
      const context = (f.context as { ref: string; file: string; where: string; tokens: number; cited: boolean; sent?: boolean }[]) ?? [];
      return (
        <div className="space-y-2">
          <p className="text-[11.5px] text-muted">
            These passages were given to the writer, which may only use them and must cite each claim.
            {Number(f.prompt_tokens ?? 0) > 0 && ` ${Number(f.prompt_tokens).toLocaleString()} tokens in total.`} <Model served={served} />
          </p>
          <ul className="space-y-1">
            {context.map((item) => (
              <li key={item.ref} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11.5px]">
                <span className="grid h-5 w-5 place-items-center rounded-md bg-black/[0.06] font-mono text-[10.5px]">{item.ref}</span>
                <span className="min-w-0 flex-1 truncate">
                  {item.file}
                  {item.where ? <span className="text-muted"> · {item.where}</span> : null}
                </span>
                <span className="font-mono text-muted">{item.tokens.toLocaleString()} tok</span>
                {item.sent === false ? (
                  <span className="text-[10.5px] text-muted">over budget</span>
                ) : item.cited ? (
                  <span className="text-[10.5px] font-medium text-emerald-700">cited</span>
                ) : (
                  <span className="text-[10.5px] text-muted">read</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "verifying": {
      const sources = (f.sources as { file: string; where: string }[]) ?? [];
      return (
        <div className="space-y-2">
          <p className="text-[11.5px] text-muted">
            A second model read the answer against the cited passages and looked for anything they do not support.{" "}
            <Model served={served} />
          </p>
          {typeof f.note === "string" && f.note && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
              <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-amber-800/70">Not found in the source</p>
              {f.note}
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <Label>Checked against</Label>
              <ul className="flex flex-wrap gap-1.5">
                {sources.map((source, i) => (
                  <li key={i} className="rounded-lg bg-white px-2 py-1 text-[11.5px] ring-1 ring-black/[0.05]">
                    {source.file}
                    {source.where ? <span className="text-muted"> · {source.where}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- a step
function StepItem({ step, index, runs, last }: { step: TraceStep; index: number; runs?: SandboxRun[] | null; last: boolean }) {
  const [open, setOpen] = useState(false);
  const detail = describe(step);
  const expandable = hasDetails(step, runs);
  const failed =
    (step.stage === "verifying" && step.facts?.verified === false) ||
    (step.stage === "sandbox" && step.facts?.succeeded === false) ||
    (step.stage === "generating" && step.facts?.found === false);

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.03, ease: EASE }}
      className="relative flex gap-3"
    >
      {!last && <span aria-hidden className="absolute bottom-[-10px] left-[9px] top-6 w-px bg-black/[0.09]" />}
      <span className="relative mt-[1px]">
        <Working state="done" size={19} className={cn(failed && "text-[rgb(var(--text))]/45")} />
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <button
          type="button"
          disabled={!expandable}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={expandable ? open : undefined}
          className="group flex w-full items-start gap-2 text-left disabled:cursor-default"
        >
          <span className="min-w-0 flex-1 text-[13px] leading-snug">
            <span className="font-medium">{titleOf(step.stage, true)}</span>
            {detail && <span className="block text-[12px] text-muted">{detail}</span>}
          </span>
          <span className="shrink-0 pt-[2px] font-mono text-[11px] tabular-nums text-muted">{duration(step.ms)}</span>
          {expandable && (
            <Icon
              name="chevronDown"
              size={14}
              className={cn("mt-[2px] shrink-0 text-muted transition-transform group-hover:text-[rgb(var(--text))]", open && "rotate-180")}
            />
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && expandable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-2xl bg-black/[0.025] p-3">
                <StepDetails step={step} runs={runs} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function StepList({ steps, runs, className }: { steps: TraceStep[]; runs?: SandboxRun[] | null; className?: string }) {
  return (
    <ol className={cn("space-y-2.5", className)}>
      {steps.map((step, index) => (
        <StepItem key={`${step.stage}-${index}`} step={step} index={index} runs={runs} last={index === steps.length - 1} />
      ))}
    </ol>
  );
}

// ------------------------------------------------------------- exported
/** Shown in place of the answer until its first words arrive. */
export function LiveAnswerSteps({ steps, stage }: { steps: TraceStep[]; stage?: string }) {
  const elapsed = useElapsed(true);
  const current = stage && !steps.some((s) => s.stage === stage) ? stage : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: EASE }}
      role="status"
      aria-live="polite"
      className="w-full max-w-[600px] rounded-[20px] border border-white/70 bg-white/65 px-4 py-3.5 shadow-sm backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <Working state="working" size={22} />
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current ?? "starting"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-shimmer truncate text-[14px] font-medium"
            >
              {current ? titleOf(current, false) : "Getting started"}
            </motion.p>
          </AnimatePresence>
        </div>
        <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted">
          step {steps.length + 1} · {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>
      {steps.length > 0 && <StepList steps={steps} className="mt-3 border-t border-black/[0.05] pt-3" />}
    </motion.div>
  );
}

/** The folded record on a finished (or streaming) answer. */
export function AnswerTrace({
  trace,
  runs,
  streaming = false,
}: {
  trace: TraceStep[];
  runs?: SandboxRun[] | null;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const total = trace.reduce((sum, step) => sum + (step.ms || 0), 0);
  const notFound = trace.some((step) => step.stage === "generating" && step.facts?.found === false);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-[12.5px] text-muted transition-colors hover:bg-white/60 hover:text-[rgb(var(--text))]"
      >
        <Working state={streaming ? "working" : "done"} size={16} className={cn(notFound && "text-[rgb(var(--text))]/45")} />
        <span className={cn(streaming && "text-shimmer")}>
          {streaming ? "Writing" : notFound ? "Searched" : "Found"} in {plural(trace.length, "step")}
          {total > 0 && (
            <>
              {" "}
              · <span className="font-mono tabular-nums">{duration(total)}</span>
            </>
          )}
        </span>
        <Icon name="chevronDown" size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-[18px] border border-white/70 bg-white/55 px-3.5 py-3 backdrop-blur-md">
              <p className="mb-2.5 text-[11.5px] text-muted">Open any step to see what happened behind it.</p>
              <StepList steps={trace} runs={runs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
