/**
 * The signature glowing orb.
 *
 * Built from CSS gradients (`.orb` in index.css) rather than an image or canvas: it scales to any
 * size, themes with the palette, costs nothing to download, and the whole
 * thing stops moving under prefers-reduced-motion.
 */
import { cn } from "@/lib/utils";

export function Orb({
  size = 200,
  className,
  listening = false,
}: {
  size?: number;
  className?: string;
  listening?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* outer bloom */}
      <div
        className="absolute inset-0 animate-pulse-soft rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(184,174,230,0.6), rgba(191,227,220,0.25) 55%, transparent 72%)",
        }}
      />

      {/* the ring of light */}
      <div
        className="orb animate-orb-drift"
        style={{ width: size * 0.78, height: size * 0.78 }}
      />

      {/* listening pulse - only while actually capturing */}
      {listening && (
        <>
          <span className="absolute h-full w-full animate-listen-ring rounded-full border border-[rgb(var(--accent-bright))]/50" />
          <span
            className="absolute h-full w-full animate-listen-ring rounded-full border border-[rgb(var(--accent-bright))]/35"
            style={{ animationDelay: "0.8s" }}
          />
        </>
      )}
    </div>
  );
}
