import { cn } from "@/lib/utils";

/** Skeletons rather than spinners: the layout never jumps when data lands. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="card overflow-hidden" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex min-h-[60px] items-center gap-3.5 px-3.5 py-2.5",
            index > 0 && "border-t border-[rgb(var(--border))]",
          )}
          style={{ opacity: 1 - index * 0.16 }}
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonBubble() {
  return (
    <div className="max-w-[78%] space-y-2.5 rounded-card bg-[rgb(var(--surface))] px-4 py-3.5">
      <Skeleton className="h-3.5 w-[85%]" />
      <Skeleton className="h-3.5 w-[92%]" />
      <Skeleton className="h-3.5 w-[55%]" />
    </div>
  );
}
