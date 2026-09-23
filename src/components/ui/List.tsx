/**
 * The reference's core pattern: a small section label above a rounded card of
 * rows, each row being [circular icon] [label] [chevron].
 *
 * Rows are real buttons or links, never divs with handlers, so they are
 * keyboard reachable and announced correctly. Dividers are drawn between rows
 * rather than around them, so the card's rounded corners stay clean.
 */
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function SectionLabel({
  children,
  className,
  action,
}: {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("mb-2.5 flex items-baseline justify-between gap-3", className)}>
      <h2 className="section-label">{children}</h2>
      {action}
    </div>
  );
}

export function ListCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[24px] border border-white/40 bg-white/40 shadow-sm backdrop-blur-md overflow-hidden", className)}>
      {/* Dividers live on the rows themselves via :not(:first-child). */}
      <div className="[&>*+*]:border-t [&>*+*]:border-white/30">
        {children}
      </div>
    </div>
  );
}

interface RowProps {
  icon?: IconName;
  /** Replaces the circular icon entirely - e.g. a file-extension badge. */
  leading?: ReactNode;
  label: string;
  /** Secondary line under the label. */
  detail?: string;
  /** Right-hand value shown before the chevron. */
  value?: string;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function ListRow({
  icon,
  leading,
  label,
  detail,
  value,
  to,
  onClick,
  trailing,
  destructive = false,
  className,
}: RowProps) {
  const body = (
    <>
      {leading ??
        (icon ? (
          <span
            aria-hidden
            className={cn("icon-orb", destructive && "!text-danger")}
          >
            <Icon name={icon} size={18} />
          </span>
        ) : null)}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-medium",
            destructive && "text-danger",
          )}
        >
          {label}
        </span>
        {detail && (
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">
            {detail}
          </span>
        )}
      </span>

      {value && (
        <span className="shrink-0 text-[13.5px] text-muted">{value}</span>
      )}
      {trailing ?? (
        <Icon name="chevronRight" size={17} className="shrink-0 text-muted" />
      )}
    </>
  );

  const classes = cn("row-item w-full text-left", className);

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  );
}
