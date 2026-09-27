/**
 * What Zambot does, as six glass cards. Each carries a small working copy of
 * the real behaviour, built from the app's own parts instead of an icon: a
 * citation opening its quote, pandas adding up a sheet, the steps behind an
 * answer, a question waiting for reading to finish, a follow-up being
 * understood, and sources being switched on and off.
 */
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { FileTypeIcon } from "@/components/ui/Icon";
import { Working } from "@/components/ui/Working";
import { typed, useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function Card({ title, body, children }: { title: string; body: string; children: (on: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { margin: "-60px 0px -60px 0px" });
  return (
    <div ref={ref} className="flex flex-col rounded-[28px] border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-md">
      <div className="h-[196px] overflow-hidden rounded-[22px] border border-black/[0.03] bg-white/85 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {children(on)}
      </div>
      <div className="px-3 pb-3 pt-4">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-black/55">{body}</p>
      </div>
    </div>
  );
}

function Cite({ n, open = false }: { n: number; open?: boolean }) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded-md px-1 text-[11px] font-semibold transition-colors duration-300",
        open ? "bg-black/[0.16]" : "bg-black/[0.07]",
      )}
    >
      {n}
    </span>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  return <p className="max-w-[90%] self-end rounded-2xl rounded-br-sm bg-[#F3F1F6] px-3 py-2 text-[12.5px] leading-snug">{children}</p>;
}

function Citation({ on }: { on: boolean }) {
  const { t } = useLoop(5400, on);
  const open = t > 1300 && t < 4900;
  return (
    <div className="relative h-full">
      <p className="text-[14px] leading-relaxed">
        Either party can end the agreement with <b className="font-semibold">90 days</b> written notice.
        <Cite n={1} open={open} />
      </p>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-x-0 bottom-0 rounded-2xl border border-black/5 bg-white p-3 shadow-lifted"
          >
            <p className="text-[11.5px] font-medium text-black/50">service_agreement.pdf · Page 3</p>
            <blockquote className="mt-1.5 border-l-2 border-[#E8C547] bg-[#FFF8DC] py-1.5 pl-2.5 pr-2 text-[12px] leading-snug text-black/80">
              “11.2 Either party may terminate this Agreement by giving ninety (90) days written notice.”
            </blockquote>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Calculation({ on }: { on: boolean }) {
  const { t } = useLoop(6400, on);
  const lines = [
    { text: 'df = pd.read_excel("bills.xlsx")', at: 200 },
    { text: 'df = df[~df.Dish.str.contains("biryani", case=False)]', at: 1100 },
    { text: 'df.groupby("Dish").Quantity.sum().nlargest(3)', at: 2200 },
  ];
  const rows = [
    ["Bread Omlet", "421"],
    ["Chicken Loaded Fries", "363"],
    ["Fresh Lime", "338"],
  ];
  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] flex-col">
      <div className="bg-[#1e1e1e] px-4 pb-3 pt-3.5 font-mono text-[11px] leading-[1.75] text-zinc-300">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sandbox · Python</p>
        {lines.map((line) => (
          <p key={line.at} className="truncate">
            {typed(line.text, t - line.at, 850)}
          </p>
        ))}
      </div>
      <div className="flex-1 px-4 py-2.5">
        {t > 3400 &&
          rows.map(([dish, count], i) => (
            <motion.div
              key={dish}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex justify-between py-[3px] text-[12.5px]"
            >
              <span className="truncate">{dish}</span>
              <span className="rounded bg-[#FFF1A8] px-1.5 font-semibold tabular-nums shadow-[inset_2px_0_0_#E8C547]">{count}</span>
            </motion.div>
          ))}
      </div>
    </div>
  );
}

const WORK = [
  { title: "Remembered the chat", detail: "4 messages" },
  { title: "Searched your files", detail: "12 passages" },
  { title: "Kept the strongest", detail: "3 of 12" },
  { title: "Wrote the answer", detail: "2 citations" },
  { title: "Checked each claim", detail: "all matched" },
];

function ShowsWork({ on }: { on: boolean }) {
  const { t } = useLoop(WORK.length * 900 + 1800, on);
  const current = Math.floor(t / 900);
  return (
    <div>
      <p className="mb-2.5 text-[12.5px] font-medium">{current >= WORK.length ? "Found in 5 steps" : "Working…"}</p>
      <ol className="space-y-[7px]">
        {WORK.map((step, i) => {
          const state = i < current ? "done" : i === current ? "working" : "waiting";
          return (
            <li key={step.title} className="flex items-center gap-2.5 text-[12.5px]">
              <Working state={state} size={16} />
              <span className={cn("min-w-0 flex-1 truncate", state === "waiting" && "text-black/35")}>{step.title}</span>
              <span className="shrink-0 text-[11.5px] text-black/40">{state === "waiting" ? "" : step.detail}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const WEIGHTS = [5, 15, 30, 10, 30, 10];

function AskEarly({ on }: { on: boolean }) {
  const { t } = useLoop(6600, on);
  const reading = Math.min(100, Math.round((t / 3800) * 100));
  const answered = t > 4200;
  return (
    <div className="flex h-full flex-col">
      <Bubble>When does the lease end?</Bubble>
      <p className="mt-1.5 flex items-center justify-end gap-1.5 self-end text-[11.5px] text-black/45">
        {!answered && <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />}
        {answered ? "Answered" : "I will answer as soon as reading finishes"}
      </p>
      <div className="mt-auto">
        {answered ? (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[13.5px] leading-relaxed">
            The lease ends on <b className="font-semibold">31 March 2027</b>.<Cite n={1} />
          </motion.p>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
              <span className="flex items-center gap-1.5 font-medium">
                <FileTypeIcon extension="pdf" size="sm" className="h-5 w-5 rounded-md" />
                lease_agreement.pdf
              </span>
              <span className="tabular-nums text-black/45">{reading}%</span>
            </div>
            <div className="flex gap-[3px]">
              {WEIGHTS.map((weight, i) => {
                const before = WEIGHTS.slice(0, i).reduce((sum, w) => sum + w, 0);
                const fill = Math.max(0, Math.min(1, (reading - before) / weight));
                return (
                  <span key={i} className="h-[5px] overflow-hidden rounded-full bg-black/[0.07]" style={{ flex: weight }}>
                    <span className="block h-full rounded-full bg-black" style={{ width: `${fill * 100}%` }} />
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
  const { t } = useLoop(6200, on);
  return (
    <div className="flex h-full flex-col gap-2.5">
      <p className="text-[12.5px] leading-snug text-black/45">…a late payment costs 1.5% a month.</p>
      <Bubble>{typed("and how do we end it?", t, 1100) || " "}</Bubble>
      {t > 1600 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-auto rounded-2xl bg-black/[0.035] p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-black/40">It searched for</p>
          <p className="mt-1 text-[12.5px] font-medium">{typed("How much notice is needed to end the agreement?", t - 1900, 1500)}</p>
        </motion.div>
      )}
    </div>
  );
}

const FILES = [
  { name: "contract.pdf", extension: "pdf" },
  { name: "handbook.docx", extension: "docx" },
  { name: "q3_sales.xlsx", extension: "xlsx" },
];

function Sources({ on }: { on: boolean }) {
  const { t } = useLoop(6000, on);
  const offIndex = t > 1500 && t < 4500 ? 0 : -1;
  const inUse = FILES.length - (offIndex >= 0 ? 1 : 0);
  return (
    <div>
      <p className="mb-3 text-[12.5px] font-medium">
        {inUse} of {FILES.length} documents in use
      </p>
      <ul className="space-y-2.5">
        {FILES.map((file, i) => {
          const off = i === offIndex;
          return (
            <li key={file.name} className="flex items-center gap-2.5">
              <FileTypeIcon extension={file.extension} size="sm" className={cn("transition-opacity", off && "opacity-40")} />
              <span className={cn("min-w-0 flex-1 truncate text-[13px] transition-colors", off && "text-black/35")}>{file.name}</span>
              <span className={cn("inline-flex h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors duration-300", off ? "bg-black/[0.14]" : "bg-[#3A3A40]")}>
                <span className={cn("h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300", !off && "translate-x-4")} />
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card title="Every claim has a page" body="Tap a number to see the exact passage it came from, then open that page with the passage highlighted.">
        {(on) => <Citation on={on} />}
      </Card>
      <Card title="Spreadsheets get calculated" body="Totals, top tens and trends are worked out with real code over every row - not guessed from a sample.">
        {(on) => <Calculation on={on} />}
      </Card>
      <Card title="It shows its work" body="Open any answer to see what it searched, which passages it kept and how it checked itself.">
        {(on) => <ShowsWork on={on} />}
      </Card>
      <Card title="Ask before it has finished" body="Type your question while the file is still being read. The answer arrives the moment it is ready.">
        {(on) => <AskEarly on={on} />}
      </Card>
      <Card title="Follow-ups keep the thread" body="“And how do we end it?” is understood from the conversation, so you can ask the way you think.">
        {(on) => <FollowUp on={on} />}
      </Card>
      <Card title="You choose the sources" body="Switch a file off and answers ignore it. Every chat keeps its own set of documents.">
        {(on) => <Sources on={on} />}
      </Card>
    </div>
  );
}
