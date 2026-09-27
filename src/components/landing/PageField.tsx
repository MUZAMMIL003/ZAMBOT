/**
 * The landing's background: a page of text set in the wordmark's pixels,
 * pale white on the pastel ground, in columns like an open document.
 *
 *   - it prints itself top to bottom when it first appears
 *   - every so often a highlighter sweeps across a sentence and the words
 *     turn to ink - the same yellow the app marks quoted passages with
 *   - with a mouse, the words under the pointer darken as if being read
 *
 * The text is densest at the edges and fades out where the page's own
 * copy sits, so it never competes with it. Canvas at ~30 fps, paused off
 * screen and in background tabs.
 */
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Layout = "hero" | "card";

const HIGHLIGHT = "#FFF1A8";
const EDGE = "#E8C547";
const INK = "28, 28, 32";
const PRINT_MS = 1400;
const SWEEP_MS = 650;
const HOLD_MS = 1800;
const FADE_MS = 450;
const LIFE_MS = SWEEP_MS + HOLD_MS + FADE_MS;
const LENS = 130;

interface Word {
  start: number;
  end: number;
  alpha: number;
  weight: number;
}
interface Line {
  row: number;
  words: Word[];
  weight: number;
}
interface Mark {
  line: Line;
  start: number;
  end: number;
  born: number;
}

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** How strongly the text shows at a point (0..1 across the canvas). */
function weightAt(layout: Layout, x: number, y: number, wide: boolean, narrow: boolean): number {
  if (layout === "card" && narrow) return 0.04 + 0.96 * Math.max(smooth(0.1, 0.03, y), smooth(0.9, 0.97, y));
  if (layout === "card") return 0.04 + 0.96 * smooth(0.36, 0.82, Math.hypot((x - 0.5) * 0.95, (y - 0.5) * 1.6));
  const belowNav = smooth(0.04, 0.13, y);
  if (wide) return (0.06 + 0.94 * Math.max(smooth(0.46, 0.92, x), smooth(0.8, 1, y) * 0.7)) * belowNav;
  return (0.06 + 0.94 * Math.max(smooth(0.62, 1, y) * 0.75, smooth(0.7, 1, x) * 0.35)) * belowNav;
}

function tile(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.roundRect(x, y, size, size, Math.min(2, size * 0.28));
  context.fill();
}

export function PageField({ layout = "hero", className }: { layout?: Layout; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const base = document.createElement("canvas");
    const baseContext = base.getContext("2d");
    if (!baseContext) return;

    let width = 0;
    let height = 0;
    let cell = 10;
    let size = 7;
    let lines: Line[] = [];
    let marks: Mark[] = [];
    let frame = 0;
    let lastDraw = 0;
    let nextMark = 0;
    let visible = true;
    const printed = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false, alpha: 0 };
    const seed = Math.floor(Math.random() * 1e6);

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      for (const target of [canvas, base]) {
        target.width = Math.round(width * ratio);
        target.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      baseContext.setTransform(ratio, 0, 0, ratio, 0, 0);

      const wide = width >= 1024;
      const narrow = width < 640;
      cell = narrow ? 8 : 10;
      size = cell - 3;
      const cols = Math.floor(width / cell);
      const rows = Math.floor(height / cell);
      const next = random(seed);
      const columns = Math.max(1, Math.round(width / (wide ? 420 : 360)));
      const span = Math.floor(cols / columns);
      lines = [];

      for (let column = 0; column < columns; column++) {
        const left = column * span + 3;
        const right = (column + 1) * span - 3;
        let row = 3 + 2 * Math.floor(next() * 3);
        while (row < rows - 2) {
          const paragraph = 3 + Math.floor(next() * 5);
          for (let n = 0; n < paragraph && row < rows - 2; n++, row += 2) {
            const last = n === paragraph - 1;
            const reach = left + Math.floor((right - left) * (last ? 0.3 + next() * 0.45 : 0.88 + next() * 0.12));
            const words: Word[] = [];
            let col = left;
            while (col < reach - 1) {
              const length = Math.min(reach - col, 1 + Math.floor(next() * next() * 7) + 1);
              const weight = weightAt(layout, (col + length / 2) / cols, row / rows, wide, narrow);
              words.push({ start: col, end: col + length, alpha: 0.62 * weight * (0.8 + next() * 0.4), weight });
              col += length + 1;
            }
            if (words.length) {
              lines.push({ row, words, weight: words.reduce((sum, word) => sum + word.weight, 0) / words.length });
            }
          }
          row += 2;
        }
      }

      baseContext.clearRect(0, 0, width, height);
      for (const line of lines) {
        for (const word of line.words) {
          if (word.alpha < 0.02) continue;
          baseContext.fillStyle = `rgba(255,255,255,${word.alpha.toFixed(3)})`;
          for (let c = word.start; c < word.end; c++) tile(baseContext, c * cell, line.row * cell, size);
        }
      }
      marks = [];
    };

    const spawn = (now: number) => {
      const busy = new Set(marks.map((mark) => mark.line));
      const choices = lines.filter((line) => line.weight > 0.5 && line.words.length >= 3 && !busy.has(line));
      if (!choices.length) return;
      const line = choices[Math.floor(Math.random() * choices.length)];
      const first = Math.floor(Math.random() * (line.words.length - 1));
      const last = Math.min(line.words.length - 1, first + 1 + Math.floor(Math.random() * 4));
      marks.push({ line, start: line.words[first].start, end: line.words[last].end, born: now });
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const print = Math.min(1, (now - printed) / PRINT_MS);
      if (print < 1) {
        context.save();
        context.beginPath();
        context.rect(0, 0, width, height * (1 - Math.pow(1 - print, 2)));
        context.clip();
        context.drawImage(base, 0, 0, width, height);
        context.restore();
        return;
      }
      context.drawImage(base, 0, 0, width, height);

      marks = marks.filter((mark) => now - mark.born < LIFE_MS);
      for (const mark of marks) {
        const age = now - mark.born;
        const sweep = 1 - Math.pow(1 - Math.min(1, age / SWEEP_MS), 3);
        const fade = age > SWEEP_MS + HOLD_MS ? Math.max(0, 1 - (age - SWEEP_MS - HOLD_MS) / FADE_MS) : 1;
        const x = mark.start * cell - 3;
        const y = mark.line.row * cell - 3;
        const reach = (mark.end - mark.start) * cell + 3;
        const band = size + 6;
        context.globalAlpha = fade;
        context.fillStyle = HIGHLIGHT;
        context.beginPath();
        context.roundRect(x, y, reach * sweep, band, 3);
        context.fill();
        context.fillStyle = EDGE;
        context.fillRect(x, y, 2.5, band);
        context.fillStyle = `rgba(${INK},0.85)`;
        for (const word of mark.line.words) {
          for (let c = Math.max(word.start, mark.start); c < Math.min(word.end, mark.end); c++) {
            if (c * cell < x + reach * sweep) tile(context, c * cell, mark.line.row * cell, size);
          }
        }
        context.globalAlpha = 1;
      }

      pointer.alpha += ((pointer.on ? 1 : 0) - pointer.alpha) * 0.12;
      pointer.x += (pointer.tx - pointer.x) * 0.2;
      pointer.y += (pointer.ty - pointer.y) * 0.2;
      if (pointer.alpha > 0.02) {
        for (const line of lines) {
          const cy = line.row * cell + size / 2;
          if (Math.abs(cy - pointer.y) > LENS) continue;
          for (const word of line.words) {
            if ((word.end * cell < pointer.x - LENS) || (word.start * cell > pointer.x + LENS)) continue;
            for (let c = word.start; c < word.end; c++) {
              const distance = Math.hypot(c * cell + size / 2 - pointer.x, cy - pointer.y);
              if (distance >= LENS) continue;
              const strength = Math.pow(1 - distance / LENS, 1.6) * 0.5 * pointer.alpha * (0.35 + 0.65 * word.weight);
              context.fillStyle = `rgba(${INK},${strength.toFixed(3)})`;
              tile(context, c * cell, line.row * cell, size);
            }
          }
        }
      }
    };

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - lastDraw < 33) return;
      lastDraw = now;
      if (now >= nextMark && now - printed > PRINT_MS) {
        if (marks.length < 3) spawn(now);
        nextMark = now + 1100 + Math.random() * 700;
      }
      draw(now);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer.tx = event.clientX - rect.left;
      pointer.ty = event.clientY - rect.top;
      pointer.on = pointer.tx >= 0 && pointer.ty >= 0 && pointer.tx <= rect.width && pointer.ty <= rect.height;
      if (pointer.on && pointer.alpha < 0.05) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
    };
    const onLeave = () => {
      pointer.on = false;
    };

    build();
    const resize = new ResizeObserver(() => build());
    resize.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    seen.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      seen.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [layout]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none block h-full w-full", className)} />;
}
