/**
 * The hero's product window: Zambot doing its real job, on a 17-second loop.
 *
 *   READ  the file goes through the six reading steps while a scan line
 *         passes down the page
 *   ASK   a question is typed, the answer streams in with its citation, and
 *         the quoted line lights up on the page
 *   CALC  a spreadsheet question: the pandas code runs in the sandbox, the
 *         rows are summed and the total is highlighted
 *
 * The tabs jump straight to a part. It pauses when scrolled out of view.
 */
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Working";
import { typed, useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const PERIOD = 17000;
const PARTS = [
  { key: "read", label: "Read", at: 0 },
  { key: "ask", label: "Ask", at: 5600 },
  { key: "calc", label: "Calc", at: 11600 },
] as const;

const STEPS = [
  { name: "Upload", detail: "private storage", start: 0, end: 350 },
  { name: "Inspect", detail: "3 pages · 1 table", start: 350, end: 1500 },
  { name: "Extract", detail: "script passed checks", start: 1500, end: 2700 },
  { name: "Split", detail: "28 passages", start: 2700, end: 3400 },
  { name: "Map meaning", detail: "768 numbers each", start: 3400, end: 4600 },
  { name: "File away", detail: "searchable", start: 4600, end: 5200 },
];

const LINES = [92, 64, 0, 88, 95, 71, 0, 90, 84, 97, 58, 0, 93, 80, 66];
const QUOTE_LINE = 8;
const SALES = [
  ["North", "14,500"],
  ["South", "9,800"],
  ["East", "11,200"],
  ["West", "6,500"],
];

const ms = (value: number) => `${(value / 1000).toFixed(1)}s`;

function StepRow({ step, t }: { step: (typeof STEPS)[number]; t: number }) {
  const state = t < step.start ? "wait" : t < step.end ? "run" : "done";
  const mapped = step.name === "Map meaning" && state === "run" ? Math.round(((t - step.start) / (step.end - step.start)) * 28) : null;
  return (
    <li className={cn("flex items-center gap-2.5 py-[5px] transition-opacity duration-300", state === "wait" && "opacity-30")}>
      <span className="grid h-4 w-4 shrink-0 place-items-center">
        {state === "run" ? (
          <Spark size={15} className="text-[#F2D544]" />
        ) : state === "done" ? (
          <span className="grid h-3.5 w-3.5 place-items-center bg-[#F2D544] text-black">
            <Icon name="check" size={10} strokeWidth={3.4} />
          </span>
        ) : (
          <span className="h-1.5 w-1.5 bg-white/40" />
        )}
      </span>
      <span className="w-[92px] shrink-0 text-[12.5px] text-[#EFEEE9] sm:w-[104px]">{step.name}</span>
      <span className="min-w-0 flex-1 truncate font-label text-[11px] text-[#8E8D87]">
        {mapped != null ? `${mapped} / 28 passages` : state === "wait" ? "" : step.detail}
      </span>
      <span className="font-label text-[11px] tabular-nums text-[#5E5D58]">{state === "done" ? ms(step.end - step.start) : ""}</span>
    </li>
  );
}

function Page({ t, part }: { t: number; part: "read" | "ask" | "calc" }) {
  const scan = part === "read" ? Math.min(1, Math.max(0, (t - 350) / 2350)) : 1;
  const split = part === "read" && t > 2700;
  const quote = part === "ask" && t - 5600 > 3800;
  return (
    <div className="relative h-full overflow-hidden border border-white/10 bg-[#161615] p-3.5">
      <p className="mb-3 flex items-center justify-between font-label text-[9.5px] uppercase tracking-[0.12em] text-[#8E8D87]">
        <span>service_agreement.pdf</span>
        <span>p.1</span>
      </p>
      <div className="space-y-[7px]">
        {LINES.map((width, i) => {
          if (width === 0) {
            return split ? (
              <div key={i} className="border-t border-dashed border-[#F2D544]/45" />
            ) : (
              <div key={i} className="h-[5px]" />
            );
          }
          const read = scan > i / LINES.length;
          if (i === QUOTE_LINE && quote) {
            return (
              <motion.p
                key={i}
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="-mx-1 bg-[linear-gradient(#F2D544,#F2D544)] bg-no-repeat px-1 py-[1px] text-[9.5px] font-medium leading-tight text-black"
              >
                4.2 Late payment carries a penalty of 1.5% per month on the outstanding amount.
              </motion.p>
            );
          }
          return (
            <div
              key={i}
              className={cn("h-[5px] transition-colors duration-500", read ? "bg-white/30" : "bg-white/10")}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
      {part === "read" && scan > 0 && scan < 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 h-10 bg-[linear-gradient(180deg,transparent,rgba(242,213,68,0.16),transparent)]"
          style={{ top: `calc(${scan * 100}% - 20px)` }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#F2D544]/80" />
        </div>
      )}
    </div>
  );
}

function Sheet({ t }: { t: number }) {
  const c = t - 11600;
  const summed = Math.max(0, Math.min(SALES.length, Math.floor((c - 1000) / 450)));
  const done = c > 2900;
  return (
    <div className="h-full border border-white/10 bg-[#161615] p-3.5 font-label text-[11px]">
      <p className="mb-3 flex items-center justify-between text-[9.5px] uppercase tracking-[0.12em] text-[#8E8D87]">
        <span>q3_sales.xlsx</span>
        <span>sales</span>
      </p>
      <div className="grid grid-cols-[1fr_auto] border-t border-white/10">
        <span className="border-b border-white/10 py-1.5 text-[#8E8D87]">Region</span>
        <span className="border-b border-white/10 py-1.5 text-right text-[#8E8D87]">Amount</span>
        {SALES.map(([region, amount], i) => (
          <div key={region} className="contents">
            <span className={cn("border-b border-white/[0.06] py-1.5 transition-colors", i < summed ? "text-[#EFEEE9]" : "text-[#5E5D58]")}>
              {region}
            </span>
            <span
              className={cn(
                "border-b border-white/[0.06] py-1.5 text-right tabular-nums transition-colors",
                i < summed ? "text-[#F2D544]" : "text-[#5E5D58]",
              )}
            >
              {amount}
            </span>
          </div>
        ))}
        <span className="py-2 font-medium text-[#EFEEE9]">Σ Total</span>
        <span className={cn("py-2 text-right font-medium tabular-nums transition-all duration-500", done ? "bg-[#F2D544] px-1.5 text-black" : "text-[#5E5D58]")}>
          {done ? "42,000" : "…"}
        </span>
      </div>
    </div>
  );
}

function Pill({ n }: { n: number }) {
  return (
    <span className="mx-0.5 inline-grid h-[17px] min-w-[17px] -translate-y-px place-items-center bg-[#F2D544] px-1 font-label text-[10.5px] font-semibold text-black">
      {n}
    </span>
  );
}

function Chat({ t, part }: { t: number; part: "ask" | "calc" }) {
  if (part === "ask") {
    const a = t - 5600;
    const question = typed("What's the penalty for late payment?", a, 1200);
    const answer = "Late payments carry a penalty of 1.5% per month on the outstanding amount, counted from the due date";
    const words = answer.split(" ");
    const shownWords = a < 2200 ? 0 : Math.min(words.length, Math.ceil(((a - 2200) / 1600) * words.length));
    return (
      <div className="flex h-full flex-col gap-3">
        <p className="self-end bg-[#EFEEE9] px-3 py-2 text-[13px] text-black">
          {question}
          {a < 1200 && <span className="ml-px inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-black" />}
        </p>
        {a > 1200 && a < 2200 && (
          <p className="flex items-center gap-2 font-label text-[11px] text-[#8E8D87]">
            <Spark size={14} className="text-[#F2D544]" />
            {a < 1700 ? "Searching 28 passages…" : "Picked 3 of 12 · writing"}
          </p>
        )}
        {shownWords > 0 && (
          <p className="text-[13.5px] leading-relaxed text-[#EFEEE9]">
            {words.slice(0, shownWords).join(" ")}
            {shownWords === words.length && (
              <>
                {"."}
                <Pill n={1} />
              </>
            )}
          </p>
        )}
        <AnimatePresence>
          {a > 4000 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-auto border border-white/[0.12] bg-[#161615] p-3"
            >
              <p className="font-label text-[10px] uppercase tracking-[0.12em] text-[#8E8D87]">Source 1 · page 1 · §4.2</p>
              <p className="mt-1.5 border-l-2 border-[#F2D544] pl-2 text-[12px] leading-snug text-[#D9D8D2]">
                “Late payment carries a penalty of 1.5% per month on the outstanding amount…”
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  const c = t - 11600;
  const question = typed("What were total sales in Q3?", c, 1000);
  const code1 = typed('df = pd.read_excel("q3_sales.xlsx")', c - 1000, 900);
  const code2 = typed('df["Amount"].sum()', c - 1900, 700);
  return (
    <div className="flex h-full flex-col gap-3">
      <p className="self-end bg-[#EFEEE9] px-3 py-2 text-[13px] text-black">{question}</p>
      {c > 1000 && (
        <div className="border border-white/10 bg-black/60 p-3 font-label text-[11.5px] leading-relaxed">
          <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.12em] text-[#5E5D58]">sandbox · python</p>
          <p className="text-[#D9D8D2]">
            <span className="text-[#5E5D58]">&gt;&gt;&gt; </span>
            {code1}
          </p>
          {c > 1900 && (
            <p className="text-[#D9D8D2]">
              <span className="text-[#5E5D58]">&gt;&gt;&gt; </span>
              {code2}
            </p>
          )}
          {c > 2800 && <p className="text-[#F2D544]">42000</p>}
        </div>
      )}
      {c > 3200 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13.5px] leading-relaxed text-[#EFEEE9]">
          Q3 sales came to <b className="font-semibold">42,000</b> across four regions.
          <Pill n={1} />
        </motion.p>
      )}
    </div>
  );
}

export function HeroDemo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "120px" });
  const { t, jump } = useLoop(PERIOD, inView);
  const part = t < 5600 ? "read" : t < 11600 ? "ask" : "calc";
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setClock((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={ref} className={cn("relative border border-white/[0.12] bg-[#0F0F0E] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 border border-white/30" />
          <span className="h-2 w-2 border border-white/30" />
        </span>
        <span className="min-w-0 flex-1 truncate font-label text-[11px] text-[#8E8D87]">
          <span className="text-[#EFEEE9]">zambot</span> @ service_agreement.pdf
        </span>
        <div className="flex border border-white/[0.12]" role="tablist" aria-label="Demo">
          {PARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={part === item.key}
              onClick={() => jump(item.at)}
              className={cn(
                "px-2.5 py-1 font-label text-[10.5px] uppercase tracking-[0.1em] transition-colors",
                part === item.key ? "bg-[#EFEEE9] text-black" : "text-[#8E8D87] hover:text-[#EFEEE9]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3.5 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-h-[244px]">
          {part === "read" ? (
            <div>
              <p className="mb-2 font-label text-[10px] uppercase tracking-[0.14em] text-[#5E5D58]">reading · 6 steps</p>
              <ol>
                {STEPS.map((step) => (
                  <StepRow key={step.name} step={step} t={t} />
                ))}
              </ol>
              <p
                className={cn(
                  "mt-3 border-t border-white/10 pt-2.5 font-label text-[11px] text-[#EFEEE9] transition-opacity duration-500",
                  t > 5200 ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="text-[#F2D544]">■</span> READY · 28 passages · 5.2s
              </p>
            </div>
          ) : (
            <Chat t={t} part={part} />
          )}
        </div>
        <div className="hidden min-h-[244px] sm:block">{part === "calc" ? <Sheet t={t} /> : <Page t={t} part={part} />}</div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-3.5 py-2 font-label text-[10.5px] uppercase tracking-[0.12em]">
        <span className="text-[#8E8D87]">sandbox · e2b</span>
        <span className="flex items-center gap-2 text-[#EFEEE9]">
          <span className="h-1.5 w-1.5 animate-pulse bg-[#F2D544]" />
          live {String(Math.floor(clock / 60)).padStart(2, "0")}:{String(clock % 60).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
