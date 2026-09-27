/**
 * The six reading steps as a track. A marker travels along it on a loop and
 * wakes each station as it passes: the number turns yellow and the station's
 * pixel icon acts out its step. Across on wide screens, down on phones.
 */
import { useInView } from "framer-motion";
import { useRef } from "react";

import { PixelMark, type PixelMode } from "@/components/ui/PixelMark";
import { useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const STATIONS: { title: string; body: string; spec: string; mode: PixelMode }[] = [
  { title: "Upload", body: "The original is kept in private storage, so you can always open it again.", spec: "supabase storage", mode: "index" },
  {
    title: "Inspect",
    body: "A throwaway sandbox opens the file and measures it: pages, text, tables, scans.",
    spec: "e2b micro-vm",
    mode: "inspect",
  },
  {
    title: "Extract",
    body: "A script is written for this exact file. It only counts if the text passes the checks.",
    spec: "3 tries · checked",
    mode: "extract",
  },
  { title: "Split", body: "The text is cut into passages small enough to quote, each tagged with its page.", spec: "≈500 tokens · page-tagged", mode: "chunk" },
  {
    title: "Map meaning",
    body: "Each passage becomes 768 numbers, so a question finds it even in other words.",
    spec: "768 dimensions",
    mode: "embed",
  },
  { title: "File away", body: "Everything is saved to search by meaning and by the exact words.", spec: "postgres · pgvector", mode: "index" },
];

const STEP_MS = 1400;
const PERIOD = STEP_MS * STATIONS.length + 1600;

export function ReadingTrack() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-120px 0px -120px 0px" });
  const { t } = useLoop(PERIOD, inView, 80);
  const progress = Math.min(1, t / (STEP_MS * STATIONS.length));
  const active = Math.min(STATIONS.length - 1, Math.floor(t / STEP_MS));
  const finished = t >= STEP_MS * STATIONS.length;

  return (
    <div ref={ref} className="relative border border-white/10">
      <div className="absolute left-0 top-0 hidden h-px w-full bg-white/10 lg:block">
        <div className="h-px bg-[#F2D544]" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="absolute left-[27px] top-0 h-full w-px bg-white/10 lg:hidden">
        <div className="w-px bg-[#F2D544]" style={{ height: `${progress * 100}%` }} />
      </div>
      <ol className="grid lg:grid-cols-6">
        {STATIONS.map((station, index) => {
          const state = finished || index < active ? "done" : index === active ? "now" : "next";
          return (
            <li
              key={station.title}
              className={cn(
                "relative flex gap-4 border-white/10 py-6 pl-[60px] pr-5 lg:block lg:border-l lg:px-5 lg:py-7 lg:first:border-l-0",
                index > 0 && "border-t lg:border-t-0",
              )}
            >
              <span
                className={cn(
                  "absolute left-[21px] top-7 h-[13px] w-[13px] border transition-colors duration-300 lg:hidden",
                  state === "next" ? "border-white/25 bg-[#0B0B0A]" : "border-[#F2D544] bg-[#F2D544]",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-label text-[12px] tracking-[0.12em] transition-colors duration-300",
                      state === "next" ? "text-[#5E5D58]" : "text-[#F2D544]",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("transition-opacity duration-300", state === "next" ? "opacity-25" : "opacity-100")}>
                    <PixelMark mode={state === "now" ? station.mode : state === "done" ? "done" : "idle"} size={30} className="text-[#EFEEE9]" />
                  </span>
                </div>
                <h3 className="mt-4 font-poster text-[26px] font-bold uppercase leading-none tracking-[-0.01em] [font-stretch:78%] lg:mt-10">
                  {station.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#A9A8A2]">{station.body}</p>
                <p className="mt-4 font-label text-[10.5px] uppercase tracking-[0.12em] text-[#5E5D58]">{station.spec}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
