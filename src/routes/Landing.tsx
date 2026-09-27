/**
 * Landing. No login: "Launch Zambot" opens a session and goes straight in.
 *
 * Ink-black and paper-white, one highlighter-yellow accent - the colour the
 * app marks quoted passages with. Headlines are condensed posters, details
 * are monospace, edges are square and sections sit on hairline grids.
 * Everything that moves shows the real product doing its real job:
 *
 *   hero      the pixel wordmark types itself; a live window reads a file,
 *             answers with a cited, highlighted page and sums a spreadsheet,
 *             over a field of pixels swept by a reading line
 *   ticker    the kinds of files it reads
 *   how       the six reading steps as a travelling track
 *   features  six cells, each a working miniature of one behaviour
 *   numbers   honest figures, set in the wordmark's pixel grid
 *   band      a giant word band that slides as you scroll
 *   start     the call to action
 */
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { FeatureCells } from "@/components/landing/FeatureCells";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { PixelField } from "@/components/landing/PixelField";
import { PixelNumber } from "@/components/landing/PixelNumber";
import { ReadingTrack } from "@/components/landing/ReadingTrack";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { useAuth } from "@/lib/providers";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const INK = "#0B0B0A";

const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  shown: (delay: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EASE } }),
};

const READS = [
  "Contracts",
  "Invoices",
  "Employee handbooks",
  "Bank statements",
  "Sales sheets",
  "Research papers",
  "Policies",
  "Café bills",
  "Leases",
  "Syllabi",
  "Tender documents",
  "Minutes of meetings",
];

const NUMBERS = [
  { value: 6, label: "steps every file goes through before you ask" },
  { value: 768, label: "numbers describe the meaning of each passage" },
  { value: 3, label: "file types: PDF, Word and Excel" },
  { value: 100, label: "pages per file, read in full" },
];

// ------------------------------------------------------------------ parts
function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-label text-[12px] uppercase tracking-[0.16em] text-[#EFEEE9]", className)}>
      <span className="text-[#8E8D87]">[</span> {children} <span className="text-[#8E8D87]">]</span>
    </p>
  );
}

function Corners() {
  return (
    <>
      {["left-[-1px] top-[-1px] border-l-2 border-t-2", "right-[-1px] top-[-1px] border-r-2 border-t-2", "bottom-[-1px] left-[-1px] border-b-2 border-l-2", "bottom-[-1px] right-[-1px] border-b-2 border-r-2"].map(
        (place) => (
          <span key={place} aria-hidden className={cn("absolute h-3 w-3 border-[#F2D544]", place)} />
        ),
      )}
    </>
  );
}

function Launch({
  onClick,
  working,
  compact = false,
  className,
}: {
  onClick: () => void;
  working: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={working}
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 overflow-hidden bg-[#F2D544] font-label font-semibold uppercase tracking-[0.1em] text-black transition-colors disabled:cursor-wait",
        compact ? "h-9 px-4 text-[11.5px]" : "h-[52px] px-7 text-[13px]",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-0 origin-left scale-x-0 bg-[#EFEEE9] transition-transform duration-300 ease-out group-hover:scale-x-100" />
      <span className="relative">{working ? "Opening…" : compact ? "Launch" : "Launch Zambot"}</span>
      {!working && (
        <span aria-hidden className="relative transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      )}
    </button>
  );
}

function Ghost({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-[52px] items-center justify-center gap-3 border border-white/25 px-7 font-label text-[13px] font-medium uppercase tracking-[0.1em] text-[#EFEEE9] transition-colors hover:border-white/60 hover:bg-white/5"
    >
      {children}
    </a>
  );
}

function Heading({ light, bold, className }: { light: string; bold: ReactNode; className?: string }) {
  return (
    <motion.h2
      variants={rise}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-80px 0px -80px 0px" }}
      className={cn(
        "mt-5 font-poster text-[clamp(40px,6.2vw,84px)] uppercase leading-[0.92] tracking-[-0.012em] [font-stretch:72%]",
        className,
      )}
    >
      <span className="block font-normal">{light}</span>
      <span className="block font-extrabold">{bold}</span>
    </motion.h2>
  );
}

function ScrollBand() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-42%"]);
  const words = ["Ask", "Cite", "Check"];
  return (
    <section ref={ref} aria-hidden className="overflow-hidden border-y border-white/10 py-6 sm:py-8">
      <motion.p
        style={{ x }}
        className="whitespace-nowrap font-poster text-[clamp(84px,17vw,240px)] font-extrabold uppercase leading-[0.84] tracking-[-0.02em] [font-stretch:68%]"
      >
        {Array.from({ length: 4 }, (_, round) =>
          words.map((word, i) => (
            <span key={`${round}-${word}`}>
              <span
                className={cn(
                  i === 1 && "text-[#F2D544]",
                  i === 2 && "text-transparent [-webkit-text-stroke:2px_#EFEEE9]",
                )}
              >
                {word}
              </span>
              <span className="mx-[0.18em] inline-block h-[0.14em] w-[0.14em] -translate-y-[0.28em] bg-[#EFEEE9]/60" />
            </span>
          )),
        )}
      </motion.p>
    </section>
  );
}

// --------------------------------------------------------------- the page
export function Landing() {
  const navigate = useNavigate();
  const { enterApp } = useAuth();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // The page is ink-black edge to edge, including the overscroll area.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    root.style.backgroundColor = INK;
    const meta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = meta?.getAttribute("content");
    meta?.setAttribute("content", INK);
    const onScroll = () => setScrolled(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.style.backgroundColor = previous;
      if (previousTheme) meta?.setAttribute("content", previousTheme);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const go = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      await enterApp();
      navigate("/chats");
    } catch {
      setError("Zambot could not start a session. Please try again.");
      setWorking(false);
    }
  }, [working, enterApp, navigate]);

  return (
    <div id="top" className="motion-essential min-h-dvh bg-[#0B0B0A] font-sans text-[#EFEEE9] antialiased selection:bg-[#F2D544] selection:text-black">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0A]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-8 px-5 sm:px-8">
          <a href="#top" aria-label="Zambot, back to top" className="flex min-w-[96px] shrink-0 items-center">
            {scrolled ? (
              <AnimatedLogo className="w-[96px] text-[#EFEEE9]" />
            ) : (
              <span className="whitespace-nowrap font-label text-[11.5px] uppercase tracking-[0.16em] text-[#8E8D87]">zambot / v1</span>
            )}
          </a>
          <nav className="hidden items-center gap-7 font-label text-[12px] uppercase tracking-[0.12em] text-[#A9A8A2] md:flex">
            <a href="#how" className="transition-colors hover:text-[#EFEEE9]">
              How it reads
            </a>
            <a href="#features" className="transition-colors hover:text-[#EFEEE9]">
              What it does
            </a>
            <a href="#numbers" className="transition-colors hover:text-[#EFEEE9]">
              Under the hood
            </a>
          </nav>
          <div className="ml-auto">
            <Launch onClick={() => void go()} working={working} compact />
          </div>
        </div>
      </header>

      <main>
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 [mask-image:linear-gradient(180deg,black_0%,rgba(0,0,0,0.55)_45%,transparent_78%)] lg:[mask-image:linear-gradient(90deg,transparent_18%,black_62%)]">
            <PixelField layout="hero" cell={10} />
          </div>
          <div className="relative mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)] gap-14 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:min-h-[calc(100dvh-56px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:items-center lg:gap-16 lg:pb-20 lg:pt-12">
            <div>
              <AnimatedLogo className="w-[min(74vw,380px)] text-[#EFEEE9]" />
              <motion.div variants={rise} initial="hidden" animate="shown" custom={1.1}>
                <Tag className="mt-10 sm:mt-12">Document intelligence</Tag>
              </motion.div>
              <motion.h1
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.25}
                className="mt-5 font-poster text-[clamp(48px,7.6vw,100px)] uppercase leading-[0.9] tracking-[-0.015em] [font-stretch:70%]"
              >
                <span className="block font-extrabold">Ask your files.</span>
                <span className="block font-normal">
                  Get the{" "}
                  <span className="relative ml-[0.1em] inline-block font-extrabold">
                    <motion.span
                      aria-hidden
                      className="absolute -inset-x-[0.08em] bottom-[0.02em] top-[0.1em] origin-left bg-[#F2D544]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, delay: 2.1, ease: EASE }}
                    />
                    <motion.span
                      className="relative"
                      initial={{ color: "#EFEEE9" }}
                      animate={{ color: "#000000" }}
                      transition={{ duration: 0.3, delay: 2.3 }}
                    >
                      page.
                    </motion.span>
                  </span>
                </span>
              </motion.h1>
              <motion.p
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.45}
                className="mt-7 max-w-[34rem] text-[17px] leading-[1.6] text-[#BDBCB6] sm:text-[18px]"
              >
                Zambot reads your PDFs, Word files and spreadsheets in a sealed sandbox, then answers in plain words -
                every claim pinned to the passage and page it came from.
              </motion.p>
              <motion.div
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.6}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Launch onClick={() => void go()} working={working} />
                <Ghost href="#how">See how it reads ↓</Ghost>
              </motion.div>
              {error && (
                <p role="alert" className="mt-4 font-label text-[12px] text-[#FF8A7A]">
                  {error}
                </p>
              )}
              <motion.p
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.75}
                className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 font-label text-[11px] uppercase tracking-[0.16em] text-[#8E8D87]"
              >
                <span className="h-2 w-2 bg-[#F2D544]" />
                Free <span className="text-[#5E5D58]">/</span> No sign-up <span className="text-[#5E5D58]">/</span> PDF · DOCX · XLSX
              </motion.p>
            </div>
            <motion.div variants={rise} initial="hidden" animate="shown" custom={0.6}>
              <HeroDemo />
            </motion.div>
          </div>
        </section>

        {/* --------------------------------------------------------- ticker */}
        <section aria-label="What Zambot reads" className="flex items-center overflow-hidden border-b border-white/10">
          <span className="relative z-10 shrink-0 border-r border-white/10 bg-[#0B0B0A] px-5 py-4 font-label text-[11.5px] uppercase tracking-[0.16em] text-[#F2D544] sm:px-8">
            Reads →
          </span>
          <div className="landing-ticker flex shrink-0">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                {READS.map((item) => (
                  <li key={item} className="flex items-center gap-6 whitespace-nowrap pl-6 font-label text-[12px] uppercase tracking-[0.14em] text-[#A9A8A2]">
                    {item}
                    <span className="h-1.5 w-1.5 bg-white/25" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ how */}
        <section id="how" className="scroll-mt-14 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
              <div>
                <Tag>How it reads</Tag>
                <Heading light="Read properly." bold="Not skimmed." />
              </div>
              <motion.p
                variants={rise}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true }}
                className="text-[16.5px] leading-relaxed text-[#A9A8A2]"
              >
                Before you ask anything, every file goes through six steps in its own sealed sandbox. Later you can open
                any of them and see exactly what happened - down to the code that ran.
              </motion.p>
            </div>
            <div className="mt-14">
              <ReadingTrack />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- features */}
        <section id="features" className="scroll-mt-14 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
              <div>
                <Tag>What it does</Tag>
                <Heading light="Answers you" bold="can check." />
              </div>
              <motion.p
                variants={rise}
                initial="hidden"
                whileInView="shown"
                viewport={{ once: true }}
                className="text-[16.5px] leading-relaxed text-[#A9A8A2]"
              >
                Zambot only answers from what you upload. When the answer is not in your files, it says so instead of
                making something up.
              </motion.p>
            </div>
            <div className="mt-14">
              <FeatureCells />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- numbers */}
        <section id="numbers" className="relative scroll-mt-14 overflow-hidden border-b border-white/10">
          <div className="absolute inset-x-0 bottom-0 h-[200px] opacity-90 [mask-image:linear-gradient(180deg,transparent_10%,black_75%)] lg:h-full">
            <PixelField layout="floor" cell={9} />
          </div>
          <div className="relative mx-auto max-w-[1320px] px-5 pb-48 pt-20 sm:px-8 lg:py-28">
            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-label text-[12px] uppercase tracking-[0.16em] text-[#EFEEE9]">
                <span className="text-[#F2D544]">►</span> Under the hood
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4">
              {NUMBERS.map((item, index) => (
                <motion.div
                  key={item.label}
                  variants={rise}
                  initial="hidden"
                  whileInView="shown"
                  viewport={{ once: true, margin: "-60px 0px -60px 0px" }}
                  custom={index * 0.08}
                  className="flex flex-col items-start lg:items-center lg:text-center"
                >
                  <PixelNumber value={item.value} className="text-[clamp(64px,9vw,120px)] text-[#EFEEE9]" />
                  <p className="mt-5 max-w-[15rem] text-[15px] leading-snug text-[#A9A8A2] sm:text-[16px]">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <ScrollBand />

        {/* ---------------------------------------------------------- start */}
        <section className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="relative border border-white/10 px-6 py-14 sm:px-12 sm:py-20">
            <Corners />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <Tag>Start here</Tag>
                <Heading light="Open a file." bold="Ask anything." />
                <p className="mt-6 max-w-[32rem] text-[16.5px] leading-relaxed text-[#A9A8A2]">
                  Free, no sign-up. Drop in a contract, a statement or a sales sheet and ask your first question while it
                  is still being read.
                </p>
              </div>
              <Launch onClick={() => void go()} working={working} />
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-4">
            <AnimatedLogo className="w-[84px] text-[#EFEEE9]" />
            <span className="font-label text-[11px] uppercase tracking-[0.14em] text-[#5E5D58]">© 2026</span>
          </div>
          <p className="font-label text-[11px] uppercase tracking-[0.14em] text-[#5E5D58]">
            Built on free tiers · Supabase · Groq · Gemini · E2B
          </p>
        </div>
      </footer>
    </div>
  );
}
