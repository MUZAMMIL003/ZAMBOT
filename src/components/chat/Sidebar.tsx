/**
 * The one navigation surface, modelled on ChatGPT / Claude: New chat, search,
 * every chat, then Files and Settings at the foot.
 *
 * lg and up it is a fixed left column; below lg the same content slides in as
 * a drawer from the ☰ button in each page header.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Icon, type IconName } from "@/components/ui/Icon";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { Chat } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const CONFIRM_MS = 3000;

interface SidebarProps {
  chats: Chat[];
  loading: boolean;
  activeChatId?: string;
  onDeleteChat: (chatId: string) => void;
  /** Drawer state, below lg. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar(props: SidebarProps) {
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <aside className="relative z-20 hidden h-dvh w-[272px] shrink-0 flex-col bg-white/40 backdrop-blur-[20px] lg:flex">
        <SidebarContent {...props} />
      </aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col bg-[#F3F0F7]/95 shadow-lifted backdrop-blur-xl safe-t"
            >
              <SidebarContent {...props} inDrawer />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  chats,
  loading,
  activeChatId,
  onDeleteChat,
  onClose,
  inDrawer = false,
}: SidebarProps & { inDrawer?: boolean }) {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  // Search titles and the names of the documents inside each chat.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(q) ||
        chat.documents.some((d) => d.filename.toLowerCase().includes(q)),
    );
  }, [chats, query]);

  return (
    <>
      <div className="flex h-[76px] shrink-0 items-center justify-between px-6">
        <Link to="/chats" aria-label="Zambot - start a new chat" className="flex items-center">
          <img src="/logo.svg" alt="ZAMBOT" className="h-[20px] w-auto opacity-90" />
        </Link>
        {inDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      <div className="space-y-3 px-4">
        <Link
          to="/chats"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[rgb(var(--accent))] text-[14.5px] font-medium text-white shadow-volt transition-transform active:scale-[0.98]"
        >
          <Icon name="plus" size={17} strokeWidth={2.2} />
          New chat
        </Link>

        <label className="flex h-10 items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-3 text-[14px] focus-within:border-black/15 focus-within:bg-white/80">
          <Icon name="search" size={16} className="shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats and files"
            aria-label="Search chats and files"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted sm:text-[14px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted hover:text-[rgb(var(--text))]"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </label>
      </div>

      <p className="mt-6 px-6 pb-1 text-[11.5px] font-medium uppercase tracking-wider text-[rgb(var(--text))]/45">
        {query ? `Results (${visible.length})` : "Chats"}
      </p>

      <nav aria-label="Chats" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="px-2">
            <SkeletonRows count={5} />
          </div>
        ) : visible.length === 0 ? (
          <p className="px-3 py-4 text-[13.5px] text-muted">
            {query ? "No chats match that search." : "No chats yet - start one above."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((chat) => {
              const active = chat.id === activeChatId;
              const armed = confirming === chat.id;
              return (
                <li key={chat.id} className="group relative">
                  <Link
                    to={`/chats/${chat.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-xl py-2.5 pl-3 pr-10 transition-colors",
                      active ? "bg-white/80 shadow-sm" : "hover:bg-white/50",
                    )}
                  >
                    <span className="block truncate text-[14px] font-medium text-[rgb(var(--text))]">
                      {chat.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[rgb(var(--text))]/50">
                      {chat.status === "pending"
                        ? "Awaiting a document"
                        : `${chat.document_count} file${chat.document_count === 1 ? "" : "s"} · ${relativeTime(chat.last_message_at || chat.updated_at)}`}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (armed) {
                        setConfirming(null);
                        onDeleteChat(chat.id);
                      } else {
                        setConfirming(chat.id);
                      }
                    }}
                    aria-label={armed ? `Confirm delete ${chat.title}` : `Delete ${chat.title}`}
                    title={armed ? "Tap again to delete" : "Delete chat"}
                    className={cn(
                      "absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full transition",
                      armed
                        ? "bg-danger/15 text-danger"
                        : "text-[rgb(var(--text))]/40 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
                    )}
                  >
                    <Icon name={armed ? "check" : "trash"} size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-white/50 px-3 py-3 safe-b">
        <FootLink to="/chats/files" icon="folder" label="Your files" active={pathname === "/chats/files"} />
        <FootLink to="/chats/settings" icon="settings" label="Settings" active={pathname === "/chats/settings"} />
      </div>
    </>
  );
}

function FootLink({
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
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
        active
          ? "bg-white/80 text-[rgb(var(--text))] shadow-sm"
          : "text-[rgb(var(--text))]/70 hover:bg-white/50 hover:text-[rgb(var(--text))]",
      )}
    >
      <Icon name={icon} size={18} strokeWidth={1.8} />
      {label}
    </Link>
  );
}
