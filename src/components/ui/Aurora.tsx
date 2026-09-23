/**
 * Soft pastel light drifting behind the landing screen.
 *
 * Three diffuse blobs on long, offset cycles so the motion never reads as a
 * loop. Purely decorative and inert; it animates transform/opacity only, so it
 * cannot cause layout work.
 */
import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  /** `full` for hero screens, `edge` for app screens where text must stay calm. */
  intensity?: "full" | "edge";
}

export function Aurora({ className, intensity = "full" }: AuroraProps) {
  const strong = intensity === "full";

  return (
    <div aria-hidden className={cn("aurora-wrap", className)}>
      <div
        className="aurora-blob animate-aurora"
        style={{
          top: "-18%",
          left: "-12%",
          width: "58%",
          height: "46%",
          background:
            "radial-gradient(circle, rgba(184,174,230,0.85), transparent 68%)",
          opacity: strong ? 0.75 : 0.4,
        }}
      />
      <div
        className="aurora-blob animate-aurora"
        style={{
          top: "8%",
          right: "-16%",
          width: "52%",
          height: "42%",
          background:
            "radial-gradient(circle, rgba(242,201,214,0.85), transparent 70%)",
          opacity: strong ? 0.6 : 0.3,
          animationDelay: "-8s",
        }}
      />
      <div
        className="aurora-blob animate-aurora"
        style={{
          bottom: "-22%",
          left: "18%",
          width: "64%",
          height: "44%",
          background:
            "radial-gradient(circle, rgba(169,220,207,0.8), transparent 72%)",
          opacity: strong ? 0.55 : 0.26,
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}
