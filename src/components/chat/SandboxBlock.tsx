/**
 * A calculation behind an answer. Only appears when the answer needed
 * arithmetic, and leads with the maths in plain words - the script and its
 * output sit behind "How", for the people who want to check.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { SandboxRun } from "@/lib/types";

export function SandboxBlock({ runs }: { runs: SandboxRun[] }) {
  if (!runs || runs.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {runs.map((run, index) => (
        <RunCard key={index} run={run} />
      ))}
    </div>
  );
}

function RunCard({ run }: { run: SandboxRun }) {
  const [expanded, setExpanded] = useState(false);
  const running = run.status === "running";
  const failed = run.status === "error";

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/75 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full",
            running
              ? "bg-black/5 text-[rgb(var(--accent-bright))]"
              : failed
                ? "bg-danger/10 text-danger"
                : "bg-positive/15 text-emerald-700",
          )}
        >
          {running ? (
            <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
          ) : failed ? (
            <Icon name="alert" size={14} />
          ) : (
            <Icon name="check" size={14} strokeWidth={2.2} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] font-medium uppercase tracking-wider text-muted">
            {running ? "Calculating…" : failed ? "Calculation failed" : "Calculated from the document"}
          </span>
          {run.summary && (
            <span className="block text-[13.5px] font-medium tabular-nums text-[rgb(var(--text))]">
              {run.summary}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-[rgb(var(--text))]/60 hover:bg-black/5 hover:text-[rgb(var(--text))]"
        >
          How
          <Icon name="chevronDown" size={14} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-black/5"
          >
            <div className="bg-[#1e1e1e] p-3 font-mono text-[12.5px] text-zinc-300">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Icon name="code" size={12} />
                Script (run in a sandbox)
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap">{run.code}</pre>
            </div>
            {(run.output || running) && (
              <div className="bg-[#0d0d0d] p-3 font-mono text-[12.5px] text-zinc-400">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <Icon name="lines" size={12} />
                  Output
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {running && !run.output ? "Executing…" : run.output}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
