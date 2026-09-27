/**
 * The "something is happening" marks.
 *
 *   Working      : a thin ring with an arc gliding round it and a breathing
 *                  centre while a step runs; it settles into a filled circle
 *                  and draws a tick when the step is done (a cross on error,
 *                  a dotted ring while waiting its turn)
 *   ProgressRing : the same ring filling to a percentage, with the number in
 *                  the middle and the arc still moving while work continues
 *
 * Monochrome, calm and exact - motion only where work is actually going on,
 * and it holds still under prefers-reduced-motion.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type WorkState = "working" | "done" | "error" | "waiting";

const EASE = [0.22, 1, 0.36, 1] as const;
const R = 9;
const RAYS = 8;

/**
 * Eight rounded rays around a small core. Each ray grows and shrinks a moment
 * after its neighbour, so a pulse keeps travelling round the mark while it
 * slowly turns: it reads as "busy thinking", not as a progress bar. Pure CSS
 * (see .spark in index.css), so it keeps moving even when the browser asks
 * for reduced motion - a loading mark is information, not decoration.
 */
function SparkRays() {
  return (
    <g className="spark-spin">
      {Array.from({ length: RAYS }, (_, i) => (
        <g key={i} transform={`rotate(${(360 / RAYS) * i} 12 12)`}>
          <line x1="12" y1="8.4" x2="12" y2="2.4" className="spark-ray" style={{ animationDelay: `${(-1.12 * i) / RAYS}s` }} />
        </g>
      ))}
      <circle cx="12" cy="12" r="1.9" className="spark-core" />
    </g>
  );
}

/** The spark on its own, for places that only ever show "working". */
export function Spark({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("spark motion-essential shrink-0 overflow-visible text-[rgb(var(--text))]", className)}
    >
      <SparkRays />
    </svg>
  );
}

export function Working({
  state = "working",
  size = 20,
  className,
  label,
}: {
  state?: WorkState;
  size?: number;
  className?: string;
  label?: string;
}) {
  const still = Boolean(useReducedMotion());
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("spark motion-essential shrink-0 overflow-visible text-[rgb(var(--text))]", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "working" && (
          <motion.g key="working" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} style={{ transformOrigin: "12px 12px" }}>
            <SparkRays />
          </motion.g>
        )}
        {state === "done" && (
          <motion.g key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} style={{ transformOrigin: "12px 12px" }}>
            <circle cx="12" cy="12" r="10.5" fill="currentColor" />
            <motion.path
              d="M7.6 12.3 10.6 15.2 16.4 9.1"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: still ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.1, ease: EASE }}
            />
          </motion.g>
        )}
        {state === "error" && (
          <motion.g key="error" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} style={{ transformOrigin: "12px 12px" }}>
            <circle cx="12" cy="12" r="10.5" fill="#E5484D" />
            <path d="M8.8 8.8 15.2 15.2M15.2 8.8 8.8 15.2" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </motion.g>
        )}
        {state === "waiting" && (
          <motion.g key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <circle cx="12" cy="12" r={R} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.6" strokeDasharray="1.6 3.1" strokeLinecap="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

export function ProgressRing({
  percent,
  size = 56,
  state = "working",
  className,
}: {
  percent: number;
  size?: number;
  state?: WorkState;
  className?: string;
}) {
  const still = Boolean(useReducedMotion());
  const radius = 24;
  const length = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden className="absolute inset-0 -rotate-90 text-[rgb(var(--text))]">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.09" strokeWidth="3.5" />
        <motion.circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={state === "error" ? "#E5484D" : "currentColor"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={length}
          initial={false}
          animate={{ strokeDashoffset: length * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: EASE }}
        />
        {state === "working" && !still && (
          <motion.circle
            cx="28"
            cy="28"
            r={radius + 5.5}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={`${(radius + 5.5) * 0.9} ${length * 2}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "28px 28px" }}
          />
        )}
      </svg>
      <span className="relative font-mono text-[13px] font-medium tabular-nums tracking-tight">
        {state === "error" ? "!" : `${Math.round(value)}%`}
      </span>
    </div>
  );
}
