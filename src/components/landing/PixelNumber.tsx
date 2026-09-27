/**
 * Numbers set in the same pixel grid as the Zambot wordmark (5×7 per digit).
 * When the number scrolls into view it counts up from zero.
 */
import { useInView } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

export function PixelNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px -80px 0px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1300);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  const digits = String(shown).padStart(String(value).length, " ");
  const cells = useMemo(() => {
    const list: { x: number; y: number; key: string }[] = [];
    [...digits].forEach((digit, index) => {
      const glyph = GLYPHS[digit];
      if (!glyph) return;
      glyph.forEach((row, y) =>
        [...row].forEach((bit, x) => bit === "1" && list.push({ x: index * 6 + x, y, key: `${index}-${x}-${y}` })),
      );
    });
    return list;
  }, [digits]);

  const width = digits.length * 6 - 1;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} 7`}
      role="img"
      aria-label={String(value)}
      className={cn("block h-auto fill-current", className)}
      shapeRendering="crispEdges"
      style={{ width: `${width * 0.1}em` }}
    >
      {cells.map((cell) => (
        <rect key={cell.key} x={cell.x + 0.04} y={cell.y + 0.04} width={0.92} height={0.92} />
      ))}
    </svg>
  );
}
