import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "neutral" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // The one blue control per screen.
  primary:
    "bg-[rgb(var(--accent))] text-[rgb(var(--accent-ink))] shadow-volt hover:bg-[rgb(var(--accent-bright))] hover:shadow-volt-lg",
  neutral:
    "bg-[rgb(var(--row))] text-[rgb(var(--text))] border border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]",
  ghost: "bg-transparent text-[rgb(var(--text))] hover:bg-[rgb(var(--border))]",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

// md and lg clear the 44px minimum touch target; sm is only for inline
// secondary actions inside an already-tappable row.
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[14.5px] gap-2",
  lg: "h-[52px] px-7 text-[15.5px] gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const inert = disabled || loading;

  return (
    <motion.button
      ref={ref}
      whileHover={inert ? undefined : { scale: 1.02 }}
      whileTap={inert ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      disabled={inert}
      className={cn(
        "relative inline-flex select-none items-center justify-center rounded-pill font-medium",
        "transition-colors duration-200 ease-premium",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
      {children}
    </motion.button>
  );
});
