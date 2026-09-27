import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A clock that runs from 0 to `period` milliseconds and starts over, for the
 * landing page's looping demos. It only ticks while `running` (for example
 * while the demo is on screen), and `jump(ms)` moves it to a point in the loop.
 */
export function useLoop(period: number, running = true, stepMs = 50): { t: number; jump: (ms: number) => void } {
  const [t, setT] = useState(0);
  const origin = useRef(performance.now());
  const paused = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      paused.current = performance.now();
      return;
    }
    if (paused.current != null) {
      origin.current += performance.now() - paused.current;
      paused.current = null;
    }
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= stepMs) {
        last = now;
        setT((now - origin.current) % period);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [period, running, stepMs]);

  const jump = useCallback(
    (ms: number) => {
      origin.current = performance.now() - ms;
      setT(ms % period);
    },
    [period],
  );

  return { t, jump };
}

/** The part of `text` typed out `elapsed` ms into a `duration` ms typing run. */
export function typed(text: string, elapsed: number, duration: number): string {
  if (elapsed <= 0) return "";
  return text.slice(0, Math.min(text.length, Math.ceil((elapsed / duration) * text.length)));
}
