/**
 * Zambot's working mark: a 7×7 grid of pixels - the same pixels as the
 * wordmark - that acts out what is happening right now. No glow, no
 * gradient, no sparkle: a small machine you can watch.
 *
 *   idle     a page of text with a blinking cursor
 *   inspect  a scan line sweeps down the page
 *   extract  the lines of text type themselves out
 *   chunk    the page splits into four blocks and closes again
 *   embed    the pixels ripple diagonally into dots
 *   index    columns drop into place, like cards being filed
 *   think    a ripple spreads out from the centre
 *   done     a tick, drawn stroke by stroke
 *   error    a cross
 *
 * Under prefers-reduced-motion it shows a still frame.
 */
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

export type PixelMode = "idle" | "inspect" | "extract" | "chunk" | "embed" | "index" | "think" | "done" | "error";

const N = 7;
const CENTRE = (N - 1) / 2;

const mask = (rows: string[]) => rows.map((row) => row.split("").map((c) => c === "1"));

/** A page: a title line and three lines of text. */
const PAGE = mask(["0000000", "0111110", "0000000", "0111100", "0111110", "0111000", "0000000"]);
const TICK = mask(["0000000", "0000001", "0000010", "1000100", "0101000", "0010000", "0000000"]);
const CROSS = mask(["0000000", "0100010", "0010100", "0001000", "0010100", "0100010", "0000000"]);
/** The order the tick is drawn in, as (row, col). */
const TICK_STROKE = [
  [3, 0],
  [4, 1],
  [5, 2],
  [4, 3],
  [3, 4],
  [2, 5],
  [1, 6],
];

const LOW = 0.12;
const INK = 0.92;

type Cell = { row: number; col: number; index: number };

function frame(mode: PixelMode, cell: Cell, still: boolean): { animate: TargetAndTransition; transition?: Transition } {
  const { row, col } = cell;
  const ink = PAGE[row][col];
  const loop = (duration: number, delay: number, extra: Transition = {}): Transition =>
    still ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: "easeInOut", ...extra };

  switch (mode) {
    case "inspect":
      return still
        ? { animate: { opacity: ink ? INK : LOW } }
        : {
            animate: { opacity: ink ? [0.45, 1, 0.45] : [LOW, 0.55, LOW] },
            transition: loop(1.5, row * 0.11, { repeatDelay: 0.25 }),
          };
    case "extract": {
      if (!ink) return { animate: { opacity: LOW } };
      const order = PAGE.slice(0, row).flat().filter(Boolean).length + PAGE[row].slice(0, col).filter(Boolean).length;
      return still
        ? { animate: { opacity: INK } }
        : {
            animate: { opacity: [LOW, INK, INK, LOW] },
            transition: loop(3.2, order * 0.09, { times: [0, 0.12, 0.8, 1], ease: "linear" }),
          };
    }
    case "chunk": {
      const dx = col < 3 ? -0.45 : col > 3 ? 0.45 : 0;
      const dy = row < 3 ? -0.45 : row > 3 ? 0.45 : 0;
      const seam = col === 3 || row === 3;
      if (still) return { animate: { opacity: seam ? LOW : INK } };
      return {
        animate: { opacity: seam ? [0.5, 0.05, 0.05, 0.5] : INK, x: [0, dx, dx, 0], y: [0, dy, dy, 0] },
        transition: loop(2.6, 0, { times: [0, 0.3, 0.7, 1] }),
      };
    }
    case "embed":
      return still
        ? { animate: { opacity: 0.6, scale: 0.7 } }
        : {
            animate: { opacity: [INK, 0.3, INK], scale: [1, 0.42, 1] },
            transition: loop(1.5, (row + col) * 0.07),
          };
    case "index":
      return still
        ? { animate: { opacity: INK, y: 0 } }
        : {
            animate: { opacity: [0, INK, INK, 0], y: [-2.5, 0, 0, 0] },
            transition: loop(2.4, col * 0.07 + (N - 1 - row) * 0.05, { times: [0, 0.25, 0.85, 1], ease: "easeOut" }),
          };
    case "think": {
      const distance = Math.hypot(row - CENTRE, col - CENTRE);
      return still
        ? { animate: { opacity: distance < 2 ? INK : LOW } }
        : {
            animate: { opacity: [LOW, INK, LOW], scale: [0.72, 1, 0.72] },
            transition: loop(1.6, distance * 0.13),
          };
    }
    case "done": {
      const on = TICK[row][col];
      const step = TICK_STROKE.findIndex(([r, c]) => r === row && c === col);
      return {
        animate: { opacity: on ? INK : 0.07, scale: 1 },
        transition: still ? { duration: 0 } : { duration: 0.3, delay: on ? 0.05 + step * 0.045 : 0, ease: [0.22, 1, 0.36, 1] },
      };
    }
    case "error":
      return { animate: { opacity: CROSS[row][col] ? INK : 0.07 }, transition: { duration: 0.25 } };
    default: {
      const cursor = row === 5 && col === 4;
      if (cursor && !still) {
        return { animate: { opacity: [INK, 0, INK] }, transition: loop(1.1, 0, { ease: "linear", times: [0, 0.5, 1] }) };
      }
      return { animate: { opacity: ink || cursor ? INK : LOW } };
    }
  }
}

export function PixelMark({
  mode = "idle",
  size = 28,
  className,
  label,
}: {
  mode?: PixelMode;
  size?: number;
  className?: string;
  /** Read out to screen readers; the mark is decorative without it. */
  label?: string;
}) {
  const still = Boolean(useReducedMotion());
  const cells = useMemo<Cell[]>(
    () => Array.from({ length: N * N }, (_, index) => ({ row: Math.floor(index / N), col: index % N, index })),
    [],
  );

  return (
    <svg
      viewBox="-0.6 -0.6 8.2 8.2"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 overflow-visible text-[rgb(var(--text))]", className)}
    >
      <g key={mode}>
        {cells.map((cell) => {
          const { animate, transition } = frame(mode, cell, still);
          return (
            <motion.rect
              key={cell.index}
              x={cell.col + 0.12}
              y={cell.row + 0.12}
              width={0.76}
              height={0.76}
              rx={0.14}
              fill="currentColor"
              initial={mode === "done" ? { opacity: 0.07, scale: 0.4 } : false}
              animate={animate}
              transition={transition}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          );
        })}
      </g>
    </svg>
  );
}
