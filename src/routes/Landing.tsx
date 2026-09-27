/**
 * Landing. No login: "Launch Zambot" opens a session and goes straight in.
 *
 * Built from the app's own design, turned up for a first impression: the
 * same pastel ground and frosted-white glass, black Helvetica, the pixel
 * wordmark, the charcoal send button and the yellow the app marks quoted
 * passages with. Everything that moves shows the real product at work:
 *
 *   hero      the wordmark types itself; a live window reads a file, answers
 *             with a cited, highlighted page and adds up a spreadsheet, over
 *             a page of pixel text that gets highlighted as you watch
 *   ticker    the kinds of files people bring
 *   how       the six reading steps
 *   features  six cards, each a working miniature of one behaviour
 *   numbers   honest figures, in the wordmark's pixel digits
 *   band      ask · cite · check, sliding as you scroll
 *   start     ends where the app begins: "What are we reading today?"
 */
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { FeatureCells } from "@/components/landing/FeatureCells";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { PageField } from "@/components/landing/PageField";
import { PixelNumber } from "@/components/landing/PixelNumber";
import { ReadingTrack } from "@/components/landing/ReadingTrack";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Aurora } from "@/components/ui/Aurora";
import { Icon } from "@/components/ui/Icon";
import { ZMark } from "@/components/ui/Working";
import { useAuth } from "@/lib/providers";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

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
  "Meeting minutes",
];

const NUMBERS = [
  { value: 6, label: "steps every file goes through before you ask" },
  { value: 768, label: "numbers describe the meaning of each passage" },
  { value: 3, label: "file types: PDF, Word and Excel" },
  { value: 100, label: "pages per file, read in full" },
];

// ------------------------------------------------------------------ parts
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[12px] font-medium uppercase tracking-wider text-black/45", className)}>{children}</p>;
}

function Launch({ onClick, working, className }: { onClick: () => void; working: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={working}
      className={cn(
        "group inline-flex items-center justify-center gap-3 rounded-full bg-[#2B2B30] font-medium text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] transition-colors hover:bg-[#1F1F23] active:scale-[0.98] disabled:cursor-wait",
        "h-[52px] pl-6 pr-2 text-[15.5px]",
        className,
      )}
    >
      <span>{working ? "Opening…" : "Launch Zambot"}</span>
      <span
        className={cn(
          "grid place-items-center rounded-full bg-white text-black transition-transform duration-300 group-hover:translate-x-0.5",
          "h-9 w-9",
        )}
      >
        {working ? <ZMark size={17} /> : <Icon name="arrowRight" size={17} strokeWidth={2} />}
      </span>
    </button>
  );
}

/**
 * The nav's way in: a slim charcoal pill. The wordmark's Z sits in front and
 * writes itself on hover (and while the workspace opens); the arrow steps
 * forward.
 */
function NavLaunch({ onClick, working }: { onClick: () => void; working: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={working}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group inline-flex h-9 items-center gap-2 rounded-full bg-[#2B2B30] pl-3 pr-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#1F1F23] active:scale-[0.98] disabled:cursor-wait sm:h-10 sm:pl-3.5 sm:pr-4 sm:text-[14px]"
    >
      <ZMark size={15} still={!hover && !working} className="text-white" />
      <span className="whitespace-nowrap">{working ? "Opening…" : "Start reading"}</span>
      <Icon name="arrowRight" size={15} strokeWidth={2} className="-ml-0.5 text-white/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white" />
    </button>
  );
}

function Heading({ label, title, muted, children }: { label: string; title: string; muted: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-end">
      <motion.div variants={rise} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-80px 0px -80px 0px" }}>
        <Label>{label}</Label>
        <h2 className="mt-3 text-[clamp(36px,5vw,64px)] font-semibold leading-[1.02] tracking-[-0.04em]">
          {title}
          <br />
          <span className="text-black/35">{muted}</span>
        </h2>
      </motion.div>
      <motion.p
        variants={rise}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: "-80px 0px -80px 0px" }}
        custom={0.1}
        className="text-[16.5px] leading-relaxed text-black/60"
      >
        {children}
      </motion.p>
    </div>
  );
}

/** The app's quote highlight, swept across a word. */
function Highlight({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="relative inline-block">
      <motion.span
        aria-hidden
        className="absolute -inset-x-[0.07em] bottom-[0.02em] top-[0.14em] origin-left rounded-[0.08em] bg-[#FFF1A8] shadow-[inset_0.06em_0_0_#E8C547]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.75, delay, ease: EASE }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

function ScrollBand() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["4%", "-40%"]);
  const words = ["Ask", "Cite", "Check"];
  return (
    <section ref={ref} aria-hidden className="overflow-hidden py-10 sm:py-14">
      <motion.p
        style={{ x }}
        className="whitespace-nowrap text-[clamp(76px,15vw,210px)] font-semibold leading-[1] tracking-[-0.05em]"
      >
        {Array.from({ length: 4 }, (_, round) =>
          words.map((word, i) => (
            <span key={`${round}-${word}`}>
              {i === 1 ? (
                <span className="relative inline-block">
                  <span className="absolute -inset-x-[0.05em] bottom-[0.08em] top-[0.3em] rounded-[0.05em] bg-[#FFF1A8] shadow-[inset_0.045em_0_0_#E8C547]" />
                  <span className="relative">{word}</span>
                </span>
              ) : (
                <span className={cn(i === 2 && "text-black/[0.13]")}>{word}</span>
              )}
              <span className="mx-[0.22em] inline-block h-[0.13em] w-[0.13em] -translate-y-[0.3em] rounded-[0.02em] bg-black" />
            </span>
          )),
        )}
      </motion.p>
    </section>
  );
}

/** The start screen's logo, typing itself out when it scrolls into view. */
function TypingLogo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-80px 0px -80px 0px" });
  return (
    <div ref={ref} className={className}>
      {seen ? <AnimatedLogo className="w-full text-black" /> : <div className="aspect-[35/5] w-full" />}
    </div>
  );
}

// --------------------------------------------------------------- the page
export function Landing() {
  const navigate = useNavigate();
  const { enterApp } = useAuth();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    <div id="top" className="motion-essential relative min-h-dvh text-black antialiased">
      <div aria-hidden className="mesh-bg pointer-events-none fixed inset-0 -z-10">
        <Aurora />
      </div>

      {/* ------------------------------------------------------------ nav */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div
          className={cn(
            "mx-auto flex h-14 max-w-[1240px] items-center gap-6 rounded-2xl border pl-4 pr-2 transition-all duration-300 sm:pl-5",
            scrolled
              ? "border-white/70 bg-white/65 shadow-[0_10px_30px_-14px_rgba(60,40,110,0.3)] backdrop-blur-xl"
              : "border-transparent bg-transparent",
          )}
        >
          <a
            href="#top"
            aria-label="Zambot, back to top"
            className={cn("shrink-0 transition-opacity duration-300", scrolled ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <img src="/logo.svg" alt="ZAMBOT" className="h-[17px] w-auto" />
          </a>
          <nav className={cn("hidden items-center gap-1 text-[14px] font-medium text-black/60 transition-transform duration-300 md:flex", !scrolled && "-translate-x-[143px]")}>
            {[
              ["#how", "How it reads"],
              ["#features", "What it does"],
              ["#numbers", "Under the hood"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/60 hover:text-black">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <NavLaunch onClick={() => void go()} working={working} />
          </div>
        </div>
      </header>

      <main>
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <PageField layout="hero" />
          </div>
          <div className="relative mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-12 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-center lg:gap-14 lg:pb-20 lg:pt-24">
            <div>
              <AnimatedLogo className="w-[min(62vw,290px)] text-black" />
              <motion.div variants={rise} initial="hidden" animate="shown" custom={0.9}>
                <Label className="mt-10">Chat with your documents</Label>
              </motion.div>
              <motion.h1
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.0}
                className="mt-4 text-[clamp(46px,6.6vw,92px)] font-semibold leading-[0.98] tracking-[-0.045em]"
              >
                Ask your files.
                <br />
                <span className="text-black/35">Get the </span>
                <Highlight delay={1.9}>page.</Highlight>
              </motion.h1>
              <motion.p
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.15}
                className="mt-6 max-w-[33rem] text-[17px] leading-[1.6] text-black/60 sm:text-[18px]"
              >
                Zambot reads your PDFs, Word files and spreadsheets in a sealed sandbox, then answers in plain words -
                every claim pinned to the passage and page it came from.
              </motion.p>
              <motion.div
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.3}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Launch onClick={() => void go()} working={working} />
                <a
                  href="#how"
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 px-6 text-[15.5px] font-medium shadow-sm backdrop-blur-md transition-colors hover:bg-white/85"
                >
                  See how it reads
                  <Icon name="arrowRight" size={16} className="rotate-90" />
                </a>
              </motion.div>
              {error && (
                <p role="alert" className="mt-4 text-[13px] text-danger">
                  {error}
                </p>
              )}
              <motion.p
                variants={rise}
                initial="hidden"
                animate="shown"
                custom={1.45}
                className="mt-6 text-[13.5px] text-black/45"
              >
                Free · No sign-up · PDF, Word and Excel
              </motion.p>
            </div>
            <motion.div variants={rise} initial="hidden" animate="shown" custom={0.5}>
              <HeroDemo />
            </motion.div>
          </div>
        </section>

        {/* --------------------------------------------------------- ticker */}
        <section aria-label="What people bring to Zambot" className="flex items-center border-y border-white/60 bg-white/30 backdrop-blur-sm">
          <span className="shrink-0 border-r border-white/60 px-5 py-4 text-[12px] font-medium uppercase tracking-wider text-black/45 sm:px-8">
            People bring
          </span>
          <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
            <div className="landing-ticker flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {READS.map((item) => (
                    <li key={item} className="flex items-center gap-6 whitespace-nowrap pl-6 text-[15px] text-black/55">
                      {item}
                      <span className="h-1.5 w-1.5 rounded-[2px] bg-black/20" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ how */}
        <section id="how" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
            <Heading label="How it reads" title="Read properly." muted="Not skimmed.">
              Before you ask anything, every file goes through six steps in its own sealed sandbox. Later you can open any
              of them and see exactly what happened - down to the code that ran.
            </Heading>
            <div className="mt-12 lg:mt-14">
              <ReadingTrack />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- features */}
        <section id="features" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 pb-20 sm:px-8 lg:pb-28">
            <Heading label="What it does" title="Answers you" muted="can check.">
              Zambot only answers from what you upload. When the answer is not in your files, it says so instead of making
              something up.
            </Heading>
            <div className="mt-12 lg:mt-14">
              <FeatureCells />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- numbers */}
        <section id="numbers" className="scroll-mt-20">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <div className="rounded-[32px] border border-white/60 bg-white/40 px-6 py-12 shadow-sm backdrop-blur-md sm:px-10 lg:py-16">
              <Label className="text-center">Under the hood</Label>
              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 lg:mt-12 lg:grid-cols-4 lg:divide-x lg:divide-black/[0.06]">
                {NUMBERS.map((item, index) => (
                  <motion.div
                    key={item.label}
                    variants={rise}
                    initial="hidden"
                    whileInView="shown"
                    viewport={{ once: true, margin: "-60px 0px -60px 0px" }}
                    custom={index * 0.08}
                    className="flex flex-col items-start lg:items-center lg:px-4 lg:text-center"
                  >
                    <PixelNumber value={item.value} className="text-[clamp(56px,8vw,104px)] text-black" />
                    <p className="mt-4 max-w-[14rem] text-[14.5px] leading-snug text-black/55 sm:text-[15.5px]">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ScrollBand />

        {/* ---------------------------------------------------------- start */}
        <section className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:pb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/35 shadow-sm backdrop-blur-md">
            <div className="absolute inset-0">
              <PageField layout="card" />
            </div>
            <div className="relative flex flex-col items-center px-5 py-16 text-center sm:px-10 sm:py-24">
              <TypingLogo className="w-[128px] sm:w-[150px]" />
              <h2 className="mt-6 text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.05] tracking-[-0.04em]">
                What are we reading today?
              </h2>
              <p className="mx-auto mt-3 max-w-[46ch] text-[15.5px] leading-relaxed text-black/55 sm:text-[16.5px]">
                Drop in a contract, a statement or a sales sheet and ask your first question while it is still being read.
              </p>
              <button
                type="button"
                onClick={() => void go()}
                disabled={working}
                aria-label="Launch Zambot"
                className="group mt-9 flex h-14 w-full max-w-[560px] items-center gap-1 rounded-full border border-white bg-white/90 pl-3 pr-2 text-left shadow-[0_20px_50px_-24px_rgba(60,40,110,0.45)] transition hover:bg-white disabled:cursor-wait"
              >
                <span className="grid h-10 w-10 place-items-center text-black/45">
                  <Icon name="paperclip" size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-black/40">
                  {working ? "Opening your workspace…" : "Add a file and ask…"}
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2B2B30] text-white transition-transform duration-200 group-hover:scale-105">
                  {working ? <ZMark size={18} className="text-white" /> : <Icon name="arrowUp" size={19} strokeWidth={2.1} />}
                </span>
              </button>
              <p className="mt-3 text-[12.5px] text-black/45">PDF, Word and Excel · free, no sign-up</p>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-white/60">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="ZAMBOT" className="h-[14px] w-auto opacity-80" />
            <span className="text-[13px] text-black/40">© 2026</span>
          </div>
          <p className="text-[13px] text-black/40">Built on free tiers · Supabase · Groq · Gemini · E2B</p>
        </div>
      </footer>
    </div>
  );
}
