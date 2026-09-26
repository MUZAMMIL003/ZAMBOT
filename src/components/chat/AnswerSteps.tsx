/**
 * What happened between the question and the answer.
 *
 *   LiveAnswerSteps : while the answer is being prepared - each finished step
 *                     with what it found and how long it took, and the step
 *                     running now, acted out by the pixel mark
 *   AnswerTrace     : kept on every answer as one quiet line ("Found in 6
 *                     steps · 8.4s") that opens into the same timeline
 *
 * Plain verbs throughout: recalled, searched, picked, wrote, checked.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { PixelMark } from "@/components/ui/PixelMark";
import { STEPS, describe, duration, plural, titleOf } from "@/lib/pipeline";
import type { TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function useElapsed(running: boolean): number {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [running]);
  return now - start;
}

function StepLine({ step, index }: { step: TraceStep; index: number }) {
  const detail = describe(step);
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.03, ease: EASE }}
      className="flex items-start gap-2.5"
    >
      <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-[5px] bg-[rgb(var(--text))] text-white">
        <Icon name="check" size={11} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-medium">{titleOf(step.stage, true)}</span>
        {detail && <span className="block text-[12px] text-muted">{detail}</span>}
      </span>
      <span className="shrink-0 pt-[1px] font-mono text-[11px] tabular-nums text-muted">{duration(step.ms)}</span>
    </motion.li>
  );
}

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
      className="w-full max-w-[560px] rounded-[20px] border border-white/70 bg-white/60 px-4 py-3.5 shadow-sm backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[rgb(var(--text))] shadow-[0_6px_18px_rgba(0,0,0,0.16)]">
          <PixelMark mode={current ? STEPS[current]?.mode ?? "think" : "think"} size={26} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={current ?? "thinking"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="truncate text-[14px] font-medium"
            >
              {current ? titleOf(current, false) : "Getting started"}…
            </motion.p>
          </AnimatePresence>
          <p className="text-[11.5px] text-muted">
            Step {steps.length + 1} · <span className="font-mono tabular-nums">{duration(elapsed)}</span>
          </p>
        </div>
      </div>
      {steps.length > 0 && (
        <ol className="mt-3 space-y-2 border-t border-black/[0.05] pt-3">
          {steps.map((step, index) => (
            <StepLine key={`${step.stage}-${index}`} step={step} index={index} />
          ))}
        </ol>
      )}
    </motion.div>
  );
}

/** The folded record on a finished (or streaming) answer. */
export function AnswerTrace({ trace, streaming = false }: { trace: TraceStep[]; streaming?: boolean }) {
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
        <PixelMark mode={streaming ? "extract" : notFound ? "error" : "done"} size={16} />
        <span>
          {streaming ? "Writing" : notFound ? "Searched" : "Found"} in {plural(trace.length, "step")}
          {total > 0 && (
            <>
              {" "}
              · <span className="font-mono tabular-nums">{duration(total)}</span>
            </>
          )}
        </span>
        <span className="flex gap-[3px]" aria-hidden>
          {trace.map((step, index) => (
            <span
              key={index}
              title={titleOf(step.stage, true)}
              className={cn("h-1.5 w-1.5 rounded-[2px] bg-current", step.stage === "sandbox" ? "opacity-90" : "opacity-45")}
            />
          ))}
        </span>
        <Icon name="chevronDown" size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="overflow-hidden"
          >
            <ol className="relative ml-2 mt-2 space-y-2.5 border-l border-black/[0.08] py-1 pl-4">
              {trace.map((step, index) => (
                <StepLine key={`${step.stage}-${index}`} step={step} index={index} />
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
