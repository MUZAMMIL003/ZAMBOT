/**
 * The upgrade card from the reference: a dark gradient panel with floating
 * sparkles, a short pitch and one blue pill.
 *
 * The sparkles are SVG so they stay crisp and pick up the accent colour; the
 * wave at the foot is a single path rather than an image.
 */
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function PromoCard({
  title,
  body,
  cta,
  onCta,
  className,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-[rgb(var(--border))] p-4 sm:p-5",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, #10141F 0%, #0C1322 45%, #0A0F1A 100%)",
      }}
    >
      {/* light spill from the top-right, behind the sparkles */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.45), transparent 68%)",
        }}
      />

      {/* wave at the foot of the card */}
      <svg
        aria-hidden
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full opacity-50"
      >
        <path
          d="M0 38 Q 60 16 130 32 T 270 30 T 400 18 V60 H0 Z"
          fill="url(#promo-wave)"
        />
        <defs>
          <linearGradient id="promo-wave" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(37,99,235,0.35)" />
            <stop offset="100%" stopColor="rgba(45,212,191,0.18)" />
          </linearGradient>
        </defs>
      </svg>

      {/* sparkles */}
      <div aria-hidden className="pointer-events-none absolute right-4 top-5">
        {[
          { size: 30, x: 0, y: 0, delay: 0 },
          { size: 18, x: -26, y: 26, delay: 0.9 },
          { size: 13, x: 8, y: 40, delay: 1.7 },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="absolute text-[rgb(var(--accent-bright))]"
            style={{ left: s.x, top: s.y }}
            animate={reduced ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.12, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          >
            <Icon name="sparkle" size={s.size} strokeWidth={1.3} />
          </motion.span>
        ))}
      </div>

      <div className="relative max-w-[62%]">
        <h3 className="text-[16px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{body}</p>
        <Button size="sm" onClick={onCta} className="mt-4">
          {cta}
        </Button>
      </div>
    </div>
  );
}
