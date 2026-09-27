/**
 * The six reading steps, the way the app shows them: the six-part progress
 * bar, and a card per step with its mark. On a loop the bar fills and each
 * step wakes in turn - its Z writes itself while it runs, then it ticks off.
 * Six across on wide screens, a list on phones.
 */
import { useInView } from "framer-motion";
import { useRef } from "react";

import { Working } from "@/components/ui/Working";
import { useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const STATIONS = [
  { title: "Upload", body: "The original is kept in private storage, so you can open it again any time.", spec: "Supabase storage", weight: 5 },
  { title: "Inspect", body: "A throwaway sandbox opens the file and measures it: pages, text, tables, scans.", spec: "E2B sandbox", weight: 15 },
  { title: "Extract", body: "A script is written for this exact file. The text only counts if it passes the checks.", spec: "Up to 3 tries", weight: 30 },
  { title: "Split", body: "The text is cut into passages small enough to quote, each tagged with its page.", spec: "≈500 tokens each", weight: 10 },
  { title: "Map the meaning", body: "Each passage becomes 768 numbers, so a question finds it even in other words.", spec: "768 dimensions", weight: 30 },
  { title: "File it away", body: "Everything is saved to search by meaning and by the exact words.", spec: "Postgres · pgvector", weight: 10 },
];

const STEP_MS = 1400;
const RUN_MS = STEP_MS * STATIONS.length;
const PERIOD = RUN_MS + 1800;

export function ReadingTrack() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-120px 0px -120px 0px" });
  const { t } = useLoop(PERIOD, inView, 60);
  const active = Math.min(STATIONS.length - 1, Math.floor(t / STEP_MS));
  const finished = t >= RUN_MS;

  return (
    <div ref={ref} className="rounded-[28px] border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 pb-3 pt-3.5">
        <p className="shrink-0 text-[12px] font-medium uppercase tracking-wider text-black/45">
          {finished ? "Ready to ask" : `Step ${active + 1} of 6`}
        </p>
        <div className="flex flex-1 gap-[3px]">
          {STATIONS.map((station, index) => {
            const fill = finished ? 1 : Math.max(0, Math.min(1, (t - index * STEP_MS) / STEP_MS));
            return (
              <span key={station.title} className="relative h-[5px] overflow-hidden rounded-full bg-black/[0.07]" style={{ flex: station.weight }}>
                <span className="absolute inset-y-0 left-0 rounded-full bg-black" style={{ width: `${fill * 100}%` }} />
              </span>
            );
          })}
        </div>
      </div>
      <ol className="grid grid-cols-[minmax(0,1fr)] gap-1.5 lg:grid-cols-6">
        {STATIONS.map((station, index) => {
          const state = finished || index < active ? "done" : index === active ? "working" : "waiting";
          return (
            <li
              key={station.title}
              className={cn(
                "flex items-start gap-4 rounded-[22px] p-4 transition-all duration-500 lg:block lg:p-5",
                state === "working" ? "bg-white shadow-card" : state === "done" ? "bg-white/45" : "bg-transparent",
              )}
            >
              <div className="flex shrink-0 items-center justify-between lg:mb-8">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <Working state={state} size={24} />
                </span>
                <span className="hidden text-[12px] tabular-nums text-black/30 lg:block">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="min-w-0">
                <h3 className={cn("text-[17px] font-semibold tracking-[-0.01em] transition-colors", state === "waiting" && "text-black/40")}>
                  {station.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-black/55">{station.body}</p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-black/35">{station.spec}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
