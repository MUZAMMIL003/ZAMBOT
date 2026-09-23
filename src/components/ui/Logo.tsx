import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/** Wordmark. The glyph is SVG so it themes and scales with the type. */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-pill bg-[rgb(var(--accent))] text-white shadow-volt"
      >
        <Icon name="sparkle" size={18} strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight">Zambot</span>
      )}
    </span>
  );
}
