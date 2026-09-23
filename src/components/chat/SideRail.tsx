/**
 * Desktop navigation. Persistent column from lg up, replacing the tab bar.
 *
 * The per-row delete control is hover-revealed here, which is fine because
 * this rail only exists on pointer devices; touch layouts reach the same
 * action from inside the conversation instead.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { IS_DEMO, resetDemo } from "@/lib/api";
import { useAuth } from "@/lib/providers";
import type { Chat } from "@/lib/types";
import { cn, relativeTime, truncate } from "@/lib/utils";

export function SideRail({
  chats,
  loading,
  activeChatId,
  onDeleteChat,
}: {
  chats: Chat[];
  loading: boolean;
  activeChatId?: string;
  onDeleteChat: (chatId: string) => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), 3200);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <aside className="relative z-20 hidden h-dvh w-[286px] shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--bg-deep))]/70 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-4">
        <Link to="/" className="rounded-row">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-3">
        <Link to="/chats/new">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="flex h-12 items-center justify-center gap-2 rounded-pill bg-[rgb(var(--accent))] font-semibold text-white shadow-volt"
          >
            <Icon name="plus" size={18} strokeWidth={2.2} />
            <span className="text-[14.5px]">New chat</span>
          </motion.span>
        </Link>
      </div>

      {IS_DEMO && (
        <div className="mx-3 mb-3 rounded-row border border-[rgb(var(--accent))]/25 bg-[rgb(var(--accent))]/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent-bright))]">
              Demo data
            </span>
            <button
              type="button"
              onClick={() => {
                resetDemo();
                window.location.reload();
              }}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-pill px-2 text-[11.5px] text-muted transition-colors hover:text-[rgb(var(--text))]"
            >
              <Icon name="refresh" size={12} />
              Reset
            </button>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-muted">
            Sample documents, no backend running.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Chats
        </p>

        {loading ? (
          <div className="px-1">
            <SkeletonRows count={4} />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-2 py-3 text-[13px] leading-relaxed text-muted">
            No chats yet. Add a document to start one.
          </p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {chats.map((chat) => {
                const active = chat.id === activeChatId;
                return (
                  <motion.li
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={cn(
                        "group flex items-center rounded-row transition-colors",
                        active
                          ? "bg-[rgb(var(--accent))]/14"
                          : "hover:bg-[rgb(var(--border))]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/chats/${chat.id}`)}
                        title={chat.title}
                        className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-2.5 py-2 text-left"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-pill text-[12px] font-semibold",
                            active
                              ? "bg-[rgb(var(--accent))] text-white"
                              : "bg-[rgb(var(--row))] text-muted",
                          )}
                        >
                          {chat.title.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">
                            {truncate(chat.title, 24)}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                            {chat.status === "pending"
                              ? "Awaiting a document"
                              : relativeTime(chat.last_message_at || chat.updated_at)}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label={
                          confirming === chat.id
                            ? `Confirm deleting ${chat.title}`
                            : `Delete ${chat.title}`
                        }
                        onClick={() => {
                          if (confirming === chat.id) {
                            onDeleteChat(chat.id);
                            setConfirming(null);
                          } else {
                            setConfirming(chat.id);
                          }
                        }}
                        className={cn(
                          "mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-pill transition",
                          confirming === chat.id
                            ? "bg-danger/15 text-danger"
                            : "text-muted opacity-0 hover:text-danger group-hover:opacity-100 group-focus-within:opacity-100",
                        )}
                      >
                        <Icon
                          name={confirming === chat.id ? "check" : "trash"}
                          size={16}
                        />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[rgb(var(--border))] p-2.5">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-[rgb(var(--row))] text-[12px] font-semibold uppercase"
        >
          {(user?.display_name || user?.email || "Z").slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">
            {user?.display_name || "You"}
          </span>
          <span className="block truncate text-[11.5px] text-muted">
            {user?.email}
          </span>
        </span>
        <ThemeToggle />
        <button
          type="button"
          onClick={logout}
          aria-label="Leave this session"
          title="Leave this session"
          className="ctrl h-10 w-10 text-muted hover:text-danger"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </aside>
  );
}
