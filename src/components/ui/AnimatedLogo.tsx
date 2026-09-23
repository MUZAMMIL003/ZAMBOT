import { motion } from "framer-motion";
import { useMemo } from "react";

const LETTERS: Record<string, string[]> = {
  Z: [
    "11111",
    "00010",
    "00100",
    "01000",
    "11111",
  ],
  A: [
    "01110",
    "10001",
    "11111",
    "10001",
    "10001",
  ],
  M: [
    "10001",
    "11011",
    "10101",
    "10001",
    "10001",
  ],
  B: [
    "11110",
    "10001",
    "11110",
    "10001",
    "11110",
  ],
  O: [
    "01110",
    "10001",
    "10001",
    "10001",
    "01110",
  ],
  T: [
    "11111",
    "00100",
    "00100",
    "00100",
    "00100",
  ],
};

const WORD = "ZAMBOT";
const LETTER_WIDTH = 5;
const LETTER_HEIGHT = 5;
const GAP = 1;
const TOTAL_WIDTH = WORD.length * LETTER_WIDTH + (WORD.length - 1) * GAP;

export function AnimatedLogo({ className }: { className?: string }) {
  const rects = useMemo(() => {
    const list: { x: number; y: number }[] = [];
    for (let i = 0; i < WORD.length; i++) {
      const char = WORD[i];
      const grid = LETTERS[char];
      const offsetX = i * (LETTER_WIDTH + GAP);
      for (let y = 0; y < LETTER_HEIGHT; y++) {
        for (let x = 0; x < LETTER_WIDTH; x++) {
          if (grid[y][x] === "1") {
            list.push({ x: offsetX + x, y });
          }
        }
      }
    }
    return list;
  }, []);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${TOTAL_WIDTH} ${LETTER_HEIGHT}`}
      className={className}
      shapeRendering="crispEdges"
      fill="currentColor"
    >
      {rects.map((rect, i) => (
        <motion.rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width="1"
          height="1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.1,
            delay: i * 0.015, // fast typing effect
          }}
        />
      ))}
    </svg>
  );
}
