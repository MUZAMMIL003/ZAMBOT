/**
 * What Zambot does, as six cells on a hairline grid. Every cell carries a
 * small working demo of the real behaviour instead of an icon: a citation
 * opening its quote, pandas summing a sheet, the steps behind an answer, a
 * question waiting for reading to finish, a follow-up being understood, and
 * sources being switched on and off.
 */
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { Spark } from "@/components/ui/Working";
import { typed, useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const YELLOW = "#F2D544";

function Cell({ index, title, body, children }: { index: number; title: string; body: string; children: (on: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { margin: "-60px 0px -60px 0px" });
  return (
    <div ref={ref} className="group relative flex flex-col bg-[#0B0B0A] p-5 sm:p-6">
      <span className="font-label text-[11px] tracking-[0.14em] text-[#5E5D58]">{String(index).padStart(2, "0")}</span>
      <div className="mt-4 h-[176px] overflow-hidden border border-white/10 bg-[#111110] p-4">{children(on)}</div>
      <h3 className="mt-5 text-[19px] font-medium tracking-[-0.01em] text-[#EFEEE9]">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[#A9A8A2]">{body}</p>
    </div>
  );
}

function Pill({ n, lit = false }: { n: number; lit?: boolean }) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-grid h-[17px] min-w-[17px] -translate-y-px place-items-center px-1 font-label text-[10.5px] font-semibold transition-colors",
        lit ? "bg-[#F2D544] text-black" : "bg-white/15 text-[#EFEEE9]",
      )}
    >
      {n}
    </span>
  );
}

function Citation({ on }: { on: boolean }) {
  const { t } = useLoop(5200, on);
  const open = t > 1300 && t < 4700;
  return (
    <div className="relative h-full">
      <p className="text-[14px] leading-relaxed text-[#EFEEE9]">
        Either party can end the agreement with <b className="font-semibold">90 days</b> written notice.
        <Pill n={1} lit={open} />
      </p>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-x-0 bottom-0 border border-white/[0.12] bg-[#1A1A19] p-3"
          >
            <p className="font-label text-[10px] uppercase tracking-[0.12em] text-[#8E8D87]">service_agreement.pdf · page 3</p>
            <p className="mt-1.5 border-l-2 pl-2 text-[12px] leading-snug text-[#D9D8D2]" style={{ borderColor: YELLOW }}>
              “11.2 Either party may terminate this Agreement for convenience by giving ninety (90) days written notice.”
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Calculation({ on }: { on: boolean }) {
  const { t } = useLoop(6200, on);
  const lines = [
    { text: 'df = pd.read_excel("bills.xlsx")', at: 200 },
    { text: 'df = df[~df.Dish.str.contains("biryani", case=False)]', at: 1200 },
    { text: "df.groupby('Dish').Quantity.sum().nlargest(3)", at: 2400 },
  ];
  return (
    <div className="font-label text-[11px] leading-[1.7]">
      {lines.map((line) => (
        <p key={line.at} className="truncate text-[#D9D8D2]">
          <span className="text-[#5E5D58]">&gt;&gt;&gt; </span>
          {typed(line.text, t - line.at, 900)}
        </p>
      ))}
      {t > 3600 && (
        <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-6 text-[#EFEEE9]">
          {[
            ["Bread Omlet", "421"],
            ["Chicken Loaded Fries", "363"],
            ["Fresh Lime", "338"],
          ].map(([dish, count], i) => (
            <motion.div key={dish} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }} className="contents">
              <span className="truncate">{dish}</span>
              <span className="text-right tabular-nums" style={{ color: YELLOW }}>
                {count}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

const WORK = [
  { title: "Recalled the chat", detail: "4 messages" },
  { title: "Searched the files", detail: "12 passages" },
  { title: "Kept the strongest", detail: "3 of 12" },
  { title: "Wrote the answer", detail: "2 citations" },
  { title: "Checked each claim", detail: "all matched" },
];

function ShowsWork({ on }: { on: boolean }) {
  const { t } = useLoop(WORK.length * 900 + 1800, on);
  const current = Math.floor(t / 900);
  return (
    <ol className="space-y-[7px]">
      {WORK.map((step, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <li key={step.title} className={cn("flex items-center gap-2.5 text-[12.5px] transition-opacity", state === "next" && "opacity-25")}>
            <span className="grid h-4 w-4 shrink-0 place-items-center">
              {state === "now" ? (
                <Spark size={15} className="text-[#F2D544]" />
              ) : (
                <span className={cn("grid h-3.5 w-3.5 place-items-center", state === "done" ? "bg-[#F2D544] text-black" : "border border-white/30")}>
                  {state === "done" && <Icon name="check" size={10} strokeWidth={3.4} />}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[#EFEEE9]">{step.title}</span>
            <span className="hidden truncate font-label text-[10.5px] text-[#8E8D87] sm:inline">{state === "next" ? "" : step.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

function AskEarly({ on }: { on: boolean }) {
  const { t } = useLoop(6400, on);
  const reading = Math.min(100, Math.round((t / 3800) * 100));
  const answered = t > 4200;
  return (
    <div className="flex h-full flex-col">
      <p className="self-end bg-[#EFEEE9] px-3 py-1.5 text-[12.5px] text-black">When does the lease end?</p>
      <p className="mt-1.5 self-end font-label text-[10.5px] text-[#8E8D87]">{answered ? "answered" : "waiting for reading to finish"}</p>
      <div className="mt-auto">
        {answered ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] leading-relaxed text-[#EFEEE9]">
            The lease ends on <b className="font-semibold">31 March 2027</b>.<Pill n={1} lit />
          </motion.p>
        ) : (
          <div>
            <div className="mb-1.5 flex justify-between font-label text-[10.5px] text-[#8E8D87]">
              <span>lease_agreement.pdf</span>
              <span className="tabular-nums">{reading}%</span>
            </div>
            <div className="flex gap-[3px]">
              {[5, 15, 30, 10, 30, 10].map((weight, i, all) => {
                const before = all.slice(0, i).reduce((s, w) => s + w, 0);
                const fill = Math.max(0, Math.min(1, (reading - before) / weight));
                return (
                  <span key={i} className="h-[5px] bg-white/10" style={{ flex: weight }}>
                    <span className="block h-full" style={{ width: `${fill * 100}%`, background: YELLOW }} />
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUp({ on }: { on: boolean }) {
  const { t } = useLoop(6000, on);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <p className="self-start text-[12.5px] text-[#8E8D87]">You asked about the late-payment penalty…</p>
      <p className="self-end bg-[#EFEEE9] px-3 py-1.5 text-[12.5px] text-black">{typed("and how do we end it?", t, 1100)}</p>
      {t > 1600 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-auto border border-white/10 p-2.5">
          <p className="font-label text-[10px] uppercase tracking-[0.12em] text-[#8E8D87]">understood as</p>
          <p className="mt-1 text-[12.5px] text-[#EFEEE9]">
            {typed("How much notice is needed to end the agreement?", t - 1900, 1500)}
          </p>
        </motion.div>
      )}
    </div>
  );
}

const FILES = ["contract.pdf", "handbook.docx", "q3_sales.xlsx"];

function Sources({ on }: { on: boolean }) {
  const { t } = useLoop(6000, on);
  const offIndex = t > 1500 && t < 4500 ? 0 : -1;
  const inUse = FILES.length - (offIndex >= 0 ? 1 : 0);
  return (
    <div>
      <p className="mb-2.5 font-label text-[10.5px] uppercase tracking-[0.12em] text-[#8E8D87]">
        {inUse} of {FILES.length} in use
      </p>
      <ul className="space-y-2">
        {FILES.map((file, i) => {
          const off = i === offIndex;
          return (
            <li key={file} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className={cn("truncate font-label transition-colors", off ? "text-[#5E5D58] line-through" : "text-[#EFEEE9]")}>{file}</span>
              <span className={cn("relative h-[16px] w-[28px] shrink-0 border transition-colors", off ? "border-white/25" : "border-[#F2D544] bg-[#F2D544]")}>
                <span
                  className={cn("absolute top-[2px] h-[10px] w-[10px] transition-all duration-300", off ? "left-[2px] bg-white/40" : "left-[14px] bg-black")}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FeatureCells() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-px border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
      <Cell index={1} title="Every claim has a page" body="Tap a number to see the exact passage it came from, then jump to that page with it highlighted.">
        {(on) => <Citation on={on} />}
      </Cell>
      <Cell index={2} title="Spreadsheets get calculated" body="Totals, top-10s and trends are computed with real code over every row, not guessed from a sample.">
        {(on) => <Calculation on={on} />}
      </Cell>
      <Cell index={3} title="It shows its work" body="Open any answer to see what it searched, which passages it kept, and how it checked itself.">
        {(on) => <ShowsWork on={on} />}
      </Cell>
      <Cell index={4} title="Ask before it has finished" body="Type your question while the file is still being read. The answer arrives the moment it is ready.">
        {(on) => <AskEarly on={on} />}
      </Cell>
      <Cell index={5} title="Follow-ups keep the thread" body="“And how do we end it?” is understood from the conversation, so you can talk the way you think.">
        {(on) => <FollowUp on={on} />}
      </Cell>
      <Cell index={6} title="You choose the sources" body="Switch a file off and answers ignore it. Every chat keeps its own set of documents.">
        {(on) => <Sources on={on} />}
      </Cell>
    </div>
  );
}
