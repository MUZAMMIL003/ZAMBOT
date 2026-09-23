/**
 * Left rail, lg and up. Between lg and xl there is no History rail, so this
 * rail lists the recent chats itself; from xl the History rail takes over.
 */
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

import { Icon, type IconName } from "@/components/ui/Icon";
import type { Chat } from "@/lib/types";
import { cn, truncate } from "@/lib/utils";

const NAV_ITEMS: { id: string; label: string; icon: IconName; path: string }[] = [
  { id: "home", label: "Home", icon: "home", path: "/chats" },
  { id: "files", label: "Your files", icon: "folder", path: "/chats/files" },
];

const RECENT_LIMIT = 6;

const MotionLink = motion.create(Link);

export function NavigationRail({
  chats,
  activeChatId,
}: {
  chats: Chat[];
  activeChatId?: string;
}) {
  const location = useLocation();

  return (
    <aside className="relative z-20 hidden h-dvh w-[260px] shrink-0 flex-col bg-white/40 backdrop-blur-[20px] lg:flex">
      {/* Logo Area */}
      <div className="flex h-[100px] items-center px-8">
        <Link to="/" aria-label="Zambot home" className="flex items-center gap-3">
          <img src="/logo.svg" alt="ZAMBOT" className="h-[22px] w-auto opacity-90 drop-shadow-sm" />
        </Link>
      </div>

      {/* Primary Action */}
      <div className="px-6 py-2">
        <MotionLink
          to="/chats/new"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-3 py-2 font-medium text-[rgb(var(--accent))] transition-colors"
        >
          <Icon name="plus" size={18} strokeWidth={2.2} />
          <span className="text-[15px]">New chat</span>
        </MotionLink>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main" className="mt-6 space-y-2 px-6">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/chats" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-4 rounded-xl py-2.5 text-[15px] font-medium transition-colors",
                isActive
                  ? "text-[rgb(var(--text))]"
                  : "text-[rgb(var(--text))]/70 hover:text-[rgb(var(--text))]",
              )}
            >
              <Icon name={item.icon} size={20} strokeWidth={1.8} className={isActive ? "text-[rgb(var(--text))]" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Recent chats - only while the History rail is hidden (lg to xl). */}
      <div className="mt-8 min-h-0 flex-1 overflow-y-auto px-6 xl:hidden">
        {chats.length > 0 && (
          <>
            <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-[rgb(var(--text))]/45">
              Recent
            </p>
            <ul className="space-y-0.5">
              {chats.slice(0, RECENT_LIMIT).map((chat) => {
                const active = chat.id === activeChatId;
                return (
                  <li key={chat.id}>
                    <Link
                      to={`/chats/${chat.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "-mx-2 block rounded-lg px-2 py-2 text-[14px] transition-colors",
                        active
                          ? "bg-[rgb(var(--text))]/5 font-medium text-[rgb(var(--text))]"
                          : "text-[rgb(var(--text))]/70 hover:bg-[rgb(var(--text))]/5 hover:text-[rgb(var(--text))]",
                      )}
                    >
                      {truncate(chat.title, 26)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {chats.length > RECENT_LIMIT && (
              <Link
                to="/chats"
                className="mt-2 inline-block text-[13px] font-medium text-[rgb(var(--text))]/60 hover:text-[rgb(var(--text))]"
              >
                See all {chats.length}
              </Link>
            )}
          </>
        )}
      </div>

      {/* Settings Area */}
      <div className="mt-auto px-6 py-8 flex flex-col gap-2">
        <Link
          to="/chats/settings"
          aria-current={location.pathname.startsWith("/chats/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-4 py-2.5 text-[15px] font-medium transition-colors",
            location.pathname.startsWith("/chats/settings")
              ? "text-[rgb(var(--text))]"
              : "text-[rgb(var(--text))]/70 hover:text-[rgb(var(--text))]"
          )}
        >
          <Icon name="settings" size={20} strokeWidth={1.8} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
