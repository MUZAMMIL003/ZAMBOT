/**
 * The hero's product window, drawn with the app's own parts - the chat
 * header, the reading steps, the white question bubble, the grey citation
 * pill and its quote, the yellow page highlight, the sandbox block and the
 * composer - on a 17-second loop:
 *
 *   READ  a file goes through the six reading steps while a light passes
 *         down the page
 *   ASK   a question is typed into the composer; the answer streams in with
 *         its citation and the quoted line is highlighted on the page
 *   CALC  a spreadsheet question: pandas runs in the sandbox and the rows it
 *         added up are highlighted
 *
 * The tabs jump to a part. It pauses when scrolled out of view.
 */
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { Working, ZMark } from "@/components/ui/Working";
import { typed, useLoop } from "@/lib/useLoop";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const PERIOD = 17000;
const ASK_AT = 5600;
const CALC_AT = 11600;
const PARTS = [
  { key: "read", label: "Read", at: 0 },
  { key: "ask", label: "Ask", at: ASK_AT },
  { key: "calc", label: "Calculate", at: CALC_AT },
] as const;
type Part = (typeof PARTS)[number]["key"];

const STEPS = [
  { name: "Upload", detail: "stored privately", start: 0, end: 350 },
  { name: "Inspect", detail: "3 pages · 1 table", start: 350, end: 1500 },
  { name: "Extract", detail: "checks passed", start: 1500, end: 2700 },
  { name: "Split", detail: "28 passages", start: 2700, end: 3400 },
  { name: "Map the meaning", detail: "768 numbers each", start: 3400, end: 4600 },
  { name: "File it away", detail: "searchable", start: 4600, end: 5200 },
];
const WEIGHTS = [5, 15, 30, 10, 30, 10];

const LINES = [92, 64, 0, 88, 95, 71, 0, 90, 84, 97, 58, 0, 93, 80, 66];
const QUOTE_LINE = 8;
const QUESTION = "What's the penalty for late payment?";
const ANSWER = "Late payments carry a penalty of 1.5% per month on the amount still owed, counted from the due date";
const SUM_QUESTION = "What were total sales in Q3?";
const SALES = [
  ["North", "14,500"],
  ["South", "9,800"],
  ["East", "11,200"],
  ["West", "6,500"],
];

const seconds = (value: number) => `${(value / 1000).toFixed(1)}s`;

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-medium uppercase tracking-wider text-black/40", className)}>{children}</p>;
}

function Cite({ n, open = false }: { n: number; open?: boolean }) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded-md px-1 text-[11px] font-semibold transition-colors",
        open ? "bg-black/[0.16]" : "bg-black/[0.07]",
      )}
    >
      {n}
    </span>
  );
}

function Reading({ t }: { t: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Reading · 6 steps</Label>
        <span className="text-[11.5px] tabular-nums text-black/40">{seconds(Math.min(t, 5200))}</span>
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {STEPS.map((step, i) => {
          const fill = Math.max(0, Math.min(1, (t - step.start) / (step.end - step.start)));
          return (
            <span key={step.name} className="relative h-[5px] overflow-hidden rounded-full bg-black/[0.07]" style={{ flex: WEIGHTS[i] }}>
              <span className="absolute inset-y-0 left-0 rounded-full bg-black" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
      <ol className="mt-3 space-y-[3px]">
        {STEPS.map((step) => {
          const state = t < step.start ? "waiting" : t < step.end ? "working" : "done";
          const mapped = step.name === "Map the meaning" && state === "working" ? Math.round(((t - step.start) / (step.end - step.start)) * 28) : null;
          return (
            <li key={step.name} className={cn("flex items-center gap-2.5 rounded-xl px-1.5 py-[5px] transition-colors", state === "working" && "bg-white/80 shadow-sm")}>
              <Working state={state} size={18} />
              <span className={cn("w-[108px] shrink-0 truncate text-[13px] font-medium", state === "waiting" && "text-black/35")}>{step.name}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[12px] text-black/50">
                {mapped != null ? `${mapped} of 28` : state === "waiting" ? "" : step.detail}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Page({ t, part }: { t: number; part: Part }) {
  const scan = part === "read" ? Math.min(1, Math.max(0, (t - 350) / 2350)) : 1;
  const split = part === "read" ? t > 2700 : true;
  const quoted = part === "ask" && t - ASK_AT > 3900;
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-black/45">
        <span className="truncate">service_agreement.pdf</span>
        <span className="shrink-0">Page 1</span>
      </div>
      <div className="space-y-[7px]">
        {LINES.map((width, i) => {
          if (width === 0) {
            return split ? <div key={i} className="border-t border-dashed border-black/15" /> : <div key={i} className="h-px" />;
          }
          if (i === QUOTE_LINE && quoted) {
            return (
              <motion.p
                key={i}
                initial={{ backgroundSize: "0% 100%" }}
                animate={{ backgroundSize: "100% 100%" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="-mx-1.5 rounded-md bg-[linear-gradient(#FFF1A8,#FFF1A8)] bg-no-repeat px-1.5 py-0.5 text-[10px] font-medium leading-snug text-black shadow-[inset_3px_0_0_#E8C547]"
              >
                4.2 Late payment carries a penalty of 1.5% per month on the outstanding amount.
              </motion.p>
            );
          }
          const read = scan > i / LINES.length;
          return (
            <div
              key={i}
              className={cn("h-[6px] rounded-full transition-colors duration-500", read ? "bg-black/[0.13]" : "bg-black/[0.05]")}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
      {part === "read" && scan > 0 && scan < 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 h-12 bg-[linear-gradient(180deg,transparent,rgba(184,174,230,0.35),transparent)]"
          style={{ top: `calc(${scan * 100}% - 24px)` }}
        />
      )}
    </div>
  );
}

function Sheet({ t }: { t: number }) {
  const c = t - CALC_AT;
  const summed = Math.max(0, Math.min(SALES.length, Math.floor((c - 1600) / 420)));
  const total = c > 3300;
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3 text-[11px] font-medium text-black/45">
        <span>q3_sales.xlsx</span>
        <span>Sheet: Sales</span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-black/[0.03] text-left text-[11px] text-black/50">
            <th className="px-3.5 py-1.5 font-medium">Region</th>
            <th className="px-3.5 py-1.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {SALES.map(([region, amount], i) => (
            <tr key={region} className={cn("border-b border-black/[0.04] transition-colors duration-300", i < summed && "bg-[#FFF1A8] shadow-[inset_3px_0_0_#E8C547]")}>
              <td className="px-3.5 py-[7px]">{region}</td>
              <td className="px-3.5 py-[7px] text-right tabular-nums">{amount}</td>
            </tr>
          ))}
          <tr>
            <td className="px-3.5 py-2 font-semibold">Total</td>
            <td className="px-3.5 py-2 text-right font-semibold tabular-nums">{total ? "42,000" : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="max-w-[88%] self-end rounded-2xl rounded-br-sm bg-white px-3.5 py-2.5 text-[13px] leading-snug shadow-sm"
    >
      {children}
    </motion.p>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 self-start rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
      <ZMark size={17} />
      <span className="text-shimmer text-[12.5px] font-medium">{text}</span>
    </div>
  );
}

function Ask({ t }: { t: number }) {
  const a = t - ASK_AT;
  const words = ANSWER.split(" ");
  const shown = a < 2400 ? 0 : Math.min(words.length, Math.ceil(((a - 2400) / 1500) * words.length));
  const open = a > 4100;
  return (
    <div className="relative flex h-full flex-col gap-3">
      {a > 1300 && <Bubble>{QUESTION}</Bubble>}
      {a > 1400 && a < 2400 && <Thinking text={a < 1900 ? "Searching 28 passages" : "Writing the answer"} />}
      {shown > 0 && (
        <p className="text-[13.5px] leading-relaxed">
          {words.slice(0, shown).join(" ")}
          {shown === words.length && (
            <>
              .<Cite n={1} open={open} />
            </>
          )}
        </p>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="mt-auto rounded-2xl border border-black/5 bg-white p-3 shadow-lifted"
          >
            <p className="flex items-center gap-2 text-[11.5px] font-medium text-black/55">
              <Icon name="fileText" size={14} className="text-[#C0473A]" />
              service_agreement.pdf · Page 1
            </p>
            <blockquote className="mt-2 border-l-2 border-[#E8C547] bg-[#FFF8DC] py-1.5 pl-3 pr-2 text-[12px] leading-relaxed text-black/80">
              “Late payment carries a penalty of 1.5% per month on the outstanding amount…”
            </blockquote>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Calculate({ t }: { t: number }) {
  const c = t - CALC_AT;
  const first = typed('df = pd.read_excel("q3_sales.xlsx")', c - 1300, 800);
  const second = typed('df["Amount"].sum()', c - 2100, 600);
  return (
    <div className="flex h-full flex-col gap-3">
      {c > 1100 && <Bubble>{SUM_QUESTION}</Bubble>}
      {c > 1300 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-sm"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Icon name="code" size={14} className="text-black/60" />
            <span className="flex-1 text-[11px] font-medium uppercase tracking-wider text-black/45">Sandbox · Python</span>
            <span className="text-[11px] tabular-nums text-black/40">{c > 2900 ? "ran in 0.4s" : "running"}</span>
          </div>
          <div className="bg-[#1e1e1e] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
            <p className="truncate">{first}</p>
            {c > 2100 && <p className="truncate">{second}</p>}
            {c > 2900 && <p className="text-white">42000</p>}
          </div>
        </motion.div>
      )}
      {c > 3300 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13.5px] leading-relaxed">
          Q3 sales came to <b className="font-semibold">42,000</b> across four regions.
          <Cite n={1} />
        </motion.p>
      )}
    </div>
  );
}

function Composer({ t, part }: { t: number; part: Part }) {
  const local = part === "ask" ? t - ASK_AT : part === "calc" ? t - CALC_AT : -1;
  const typing = part === "ask" ? 1200 : 1000;
  const text = local < 0 ? "" : local <= typing + 100 ? typed(part === "ask" ? QUESTION : SUM_QUESTION, local, typing) : "";
  const pressed = local > typing && local < typing + 200;
  return (
    <div className="flex h-12 items-center gap-1 rounded-full border border-black/[0.04] bg-white/90 pl-2 pr-1.5 shadow-sm">
      <span className="grid h-9 w-9 place-items-center text-black/45">
        <Icon name="paperclip" size={17} />
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", text ? "text-black" : "text-black/40")}>
        {text || (part === "read" && t < 5200 ? "Ask while it reads…" : "Ask a question…")}
        {text && local < typing && <span className="ml-px inline-block h-3.5 w-[1.5px] translate-y-[2px] animate-caret bg-black" />}
      </span>
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-200",
          text ? "bg-[#2B2B30] text-white" : "bg-black/[0.07] text-black/35",
          pressed && "scale-90",
        )}
      >
        <Icon name="arrowUp" size={17} strokeWidth={2.1} />
      </span>
    </div>
  );
}

export function HeroDemo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "120px 0px 120px 0px" });
  const { t, jump } = useLoop(PERIOD, inView);
  const part: Part = t < ASK_AT ? "read" : t < CALC_AT ? "ask" : "calc";
  const sheet = part === "calc";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/45 p-2 shadow-[0_40px_90px_-40px_rgba(76,58,140,0.4)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-1.5">
        <FileTypeIcon extension={sheet ? "xlsx" : "pdf"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-tight">{sheet ? "Q3 sales" : "Service agreement"}</p>
          <p className="truncate text-[12px] text-black/45">{part === "read" ? (t < 5200 ? "Reading…" : "Ready · 28 passages") : "1 document"}</p>
        </div>
        <div className="flex rounded-full bg-black/[0.05] p-[3px]" role="tablist" aria-label="Demo">
          {PARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={part === item.key}
              onClick={() => jump(item.at)}
              className={cn(
                "h-7 rounded-full px-2.5 text-[12px] font-medium transition-all sm:px-3",
                part === item.key ? "bg-white text-black shadow-sm" : "text-black/45 hover:text-black",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] bg-white/40 p-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-h-[268px] p-1">
            {part === "read" ? <Reading t={t} /> : part === "ask" ? <Ask t={t} /> : <Calculate t={t} />}
          </div>
          <div className="hidden min-h-[268px] sm:block">{sheet ? <Sheet t={t} /> : <Page t={t} part={part} />}</div>
        </div>
        <div className="mt-2.5">
          <Composer t={t} part={part} />
        </div>
      </div>
    </div>
  );
}
