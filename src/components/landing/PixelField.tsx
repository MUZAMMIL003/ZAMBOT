/**
 * A living field of pixels, drawn on a canvas.
 *
 * Grey pixels gather in slow, organic clouds; each one breathes on its own
 * rhythm. A soft band of light keeps sweeping down the field - the "reading"
 * pass - and every so often a short run of pixels turns highlighter-yellow,
 * the way a quoted passage is marked in the app.
 *
 * It only draws while it is on screen and the tab is visible.
 */
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Layout = "hero" | "floor";

const HIGHLIGHT = "242, 213, 68";

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi);
  const v = s(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

interface Mark {
  row: number;
  col: number;
  length: number;
  born: number;
}

export function PixelField({ layout = "hero", cell = 10, className }: { layout?: Layout; cell?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let base = new Float32Array(0);
    let phase = new Float32Array(0);
    let speed = new Float32Array(0);
    let marks: Mark[] = [];
    let lastMark = 0;
    let frame = 0;
    let lastDraw = 0;
    let visible = true;
    const seed = Math.floor(Math.random() * 1000);

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      cols = Math.ceil(width / cell);
      rows = Math.ceil(height / cell);
      base = new Float32Array(cols * rows);
      phase = new Float32Array(cols * rows);
      speed = new Float32Array(cols * rows);
      const narrow = width < 700;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const n = 0.62 * noise(x / 13 + seed, y / 13) + 0.38 * noise(x / 4.5, y / 4.5 + seed);
          const across = x / Math.max(1, cols - 1);
          const down = y / Math.max(1, rows - 1);
          const bias =
            layout === "hero"
              ? narrow
                ? smooth(0.1, 0.0, down) * 0.55 + smooth(0.55, 1, across) * 0.4
                : smooth(0.28, 0.98, across) * 0.62
              : smooth(0.35, 1, down) * 0.7;
          const value = n * 0.62 + bias - 0.3;
          const speck = hash(x + seed, y) < 0.012 ? 0.25 : 0;
          base[i] = value > 0.4 ? Math.min(1, (value - 0.4) / 0.5) : speck;
          phase[i] = hash(x, y + seed) * Math.PI * 2;
          speed[i] = 0.6 + hash(y, x) * 1.6;
        }
      }
      marks = [];
    };

    const spawn = (now: number) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (base[row * cols + col] > 0.2) {
          marks.push({ row, col, length: 4 + Math.floor(Math.random() * 11), born: now });
          return;
        }
      }
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || now - lastDraw < 33) return;
      lastDraw = now;
      context.clearRect(0, 0, width, height);
      const sweep = ((now / 7200) % 1) * (height + 260) - 130;
      const size = cell - 1.5;
      for (let y = 0; y < rows; y++) {
        const dy = y * cell - sweep;
        const glow = Math.exp(-(dy * dy) / (2 * 55 * 55));
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const b = base[i];
          if (b <= 0) continue;
          const breathe = 0.72 + 0.28 * Math.sin(now * 0.0016 * speed[i] + phase[i]);
          const light = Math.min(1, b * breathe + glow * 0.45 * b);
          const level = Math.round(20 + light * 58);
          context.fillStyle = `rgb(${level},${level},${level - 2})`;
          context.fillRect(x * cell, y * cell, size, size);
        }
      }
      if (now - lastMark > 700) {
        spawn(now);
        lastMark = now;
      }
      marks = marks.filter((mark) => now - mark.born < 2300);
      for (const mark of marks) {
        const age = now - mark.born;
        const reveal = Math.min(mark.length, Math.floor((age / 420) * mark.length));
        const alpha = age < 1700 ? 0.85 : Math.max(0, 0.85 * (1 - (age - 1700) / 600));
        context.fillStyle = `rgba(${HIGHLIGHT},${alpha})`;
        for (let k = 0; k < reveal && mark.col + k < cols; k++) {
          context.fillRect((mark.col + k) * cell, mark.row * cell, size, size);
        }
      }
    };

    build();
    frame = requestAnimationFrame(draw);
    const resize = new ResizeObserver(() => build());
    resize.observe(canvas);
    const watch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
    });
    watch.observe(canvas);
    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      watch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cell, layout]);

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none block h-full w-full", className)} />;
}
