/**
 * The "something is happening" marks.
 *
 *   Working      : while a step runs, the Z of the Zambot wordmark writes
 *                  itself over and over - a bright pixel runs along the Z's
 *                  strokes with a fading trail. It settles into a filled
 *                  circle and draws a tick when the step is done (a cross on
 *                  error, a dotted ring while waiting its turn)
 *   ProgressRing : a ring filling to a percentage, with the number in the
 *                  middle and an arc still moving while work continues
 *
 * Monochrome and exact - motion only where work is actually going on.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type WorkState = "working" | "done" | "error" | "waiting";

const EASE = [0.22, 1, 0.36, 1] as const;
const R = 9;

/** The Z from the wordmark's 5×5 letters, in the order a pen would draw it: (row, col). */
const Z_STROKE = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 3], [2, 2], [3, 1],
  [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
];
/** Seconds between one pixel lighting and the next; the loop is .zmark-pixel in index.css. */
const Z_STEP = 0.085;
const Z_PERIOD = 1.5;

/**
 * The Z writing itself. Pure CSS, so it keeps moving even when the browser
 * asks for reduced motion - a loading mark is information, not decoration.
 */
function ZStroke() {
  return (
    <g>
      {Z_STROKE.map(([row, col], index) => (
        <rect
          key={index}
          x={1.3 + col * 4.4}
          y={1.3 + row * 4.4}
          width={3.8}
          height={3.8}
          rx={0.9}
          className="zmark-pixel"
          style={{ animationDelay: `${index * Z_STEP - Z_PERIOD}s` }}
        />
      ))}
    </g>
  );
}

/** The writing Z on its own, for places that only ever show "working". */
export function ZMark({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("zmark motion-essential shrink-0 overflow-visible text-[rgb(var(--text))]", className)}
    >
      <ZStroke />
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
      className={cn("zmark motion-essential shrink-0 overflow-visible text-[rgb(var(--text))]", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "working" && (
          <motion.g key="working" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} style={{ transformOrigin: "12px 12px" }}>
            <ZStroke />
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
