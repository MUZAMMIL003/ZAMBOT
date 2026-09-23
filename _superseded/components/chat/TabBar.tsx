/**
 * Mobile tab bar. Four destinations plus a raised black action in the middle,
 * keeping to the reference's one accent control per screen.
 *
 * Hidden inside a conversation, where the composer owns the bottom edge.
 */
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-4 bottom-4 z-30 lg:hidden rounded-full border border-[rgb(var(--border))] shadow-2xl safe-b backdrop-blur-xl bg-white/60"
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-2 py-1.5">
        <Tab to="/chats" icon="home" label="Home" active={pathname === "/chats"} />
        <Tab
          to="/chats/files"
          icon="folder"
          label="Files"
          active={pathname === "/chats/files"}
        />

        <button
          type="button"
          onClick={() => navigate("/chats/new")}
          aria-label="Start a new chat"
          className="relative -mt-4 flex shrink-0 flex-col items-center px-2"
        >
          <motion.span
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-zinc-800 to-black text-white shadow-xl ring-[4px] ring-white/60 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-50" />
            <Icon name="plus" size={26} strokeWidth={2.0} className="z-10" />
          </motion.span>
          <span className="mt-1 text-[10px] font-medium text-muted">New</span>
        </button>

        <Tab
          to="/chats/settings"
          icon="settings"
          label="Settings"
          active={pathname === "/chats/settings"}
        />
        <Tab to="/" icon="sparkle" label="About" active={false} />
      </div>
    </nav>
  );
}

function Tab({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: IconName;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      // 44px minimum in both directions.
      className={cn(
        "relative flex min-h-[54px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-row px-1 pb-1 transition-colors",
        active
          ? "text-[rgb(var(--accent-bright))]"
          : "text-muted hover:text-[rgb(var(--text))]",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-active"
          className="absolute inset-x-3 top-0 h-[2.5px] rounded-pill bg-[rgb(var(--accent-bright))]"
        />
      )}
      <Icon name={icon} size={20} strokeWidth={active ? 2.05 : 1.7} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
