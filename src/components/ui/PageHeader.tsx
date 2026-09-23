/**
 * Screen header: floating white pill. Below lg it leads with the ☰ button
 * that opens the sidebar drawer - the only navigation on small screens.
 */
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { useChats } from "@/lib/chats-context";
import { cn } from "@/lib/utils";

export function MenuButton({ className }: { className?: string }) {
  const { openSidebar } = useChats();
  return (
    <button
      type="button"
      onClick={openSidebar}
      aria-label="Open menu"
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 text-[rgb(var(--text))] shadow-sm transition hover:bg-white lg:hidden",
        className,
      )}
    >
      <Icon name="lines" size={17} />
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative z-20 px-3 pb-2 pt-3 sm:px-4 lg:px-6 lg:pt-6 safe-t", className)}>
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 rounded-[20px] border border-white/50 bg-white/40 px-3 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:px-5 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MenuButton />
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-medium tracking-tight text-[rgb(var(--text))] sm:text-[17px]">
              {title}
            </h1>
            {subtitle && <p className="truncate text-[12px] text-muted">{subtitle}</p>}
          </div>
        </div>

        {right && <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{right}</div>}
      </div>
    </header>
  );
}
