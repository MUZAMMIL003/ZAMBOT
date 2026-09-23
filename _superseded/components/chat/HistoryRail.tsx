/**
 * Right-hand chat history, xl and up. Deletes ask for a second tap rather than
 * a dialog; an unconfirmed tap quietly resets after three seconds.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Icon } from "@/components/ui/Icon";
import { SkeletonRows } from "@/components/ui/Skeleton";
import type { Chat } from "@/lib/types";
import { cn, relativeTime, truncate } from "@/lib/utils";

const CONFIRM_MS = 3000;

/** A value that clears itself CONFIRM_MS after being set. */
function useConfirm<T>() {
  const [pending, setPending] = useState<T | null>(null);
  useEffect(() => {
    if (pending === null) return;
    const timer = setTimeout(() => setPending(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [pending]);
  return [pending, setPending] as const;
}

export function HistoryRail({
  chats,
  loading,
  activeChatId,
  onDeleteChat,
  onDeleteAll,
}: {
  chats: Chat[];
  loading: boolean;
  activeChatId?: string;
  onDeleteChat: (chatId: string) => void;
  onDeleteAll: () => void;
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useConfirm<string>();
  const [confirmingAll, setConfirmingAll] = useConfirm<true>();

  return (
    <aside className="relative z-20 hidden w-[300px] shrink-0 flex-col bg-white/20 backdrop-blur-[10px] border-l border-white/40 xl:flex">
      <div className="flex h-[100px] items-center px-8">
        <h2 className="text-[18px] font-medium tracking-tight text-[rgb(var(--text))]">History</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        {loading ? (
          <SkeletonRows count={5} />
        ) : chats.length === 0 ? (
          <p className="py-4 text-[14px] text-muted text-center">No chats yet.</p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {chats.map((chat) => {
                const active = chat.id === activeChatId;
                const armed = confirming === chat.id;
                return (
                  <motion.li
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={cn(
                        "group flex items-start gap-3 rounded-lg py-2.5 px-3 transition-colors",
                        active
                          ? "bg-[rgb(var(--text))]/5"
                          : "hover:bg-[rgb(var(--text))]/5",
                      )}
                    >
                      <Icon name="folder" size={16} className="mt-1 shrink-0 text-[rgb(var(--text))]/70" />
                      <button
                        type="button"
                        onClick={() => navigate(`/chats/${chat.id}`)}
                        aria-current={active ? "page" : undefined}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block text-[14px] font-medium leading-[1.3] text-[rgb(var(--text))]">
                          {truncate(chat.title, 35)}
                        </span>
                        <span className="mt-1 block text-[12px] text-[rgb(var(--text))]/50">
                          {chat.status === "pending"
                            ? "Awaiting a document"
                            : relativeTime(chat.last_message_at || chat.updated_at)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (armed) {
                            onDeleteChat(chat.id);
                            setConfirming(null);
                          } else {
                            setConfirming(chat.id);
                          }
                        }}
                        aria-label={armed ? `Confirm delete ${chat.title}` : `Delete ${chat.title}`}
                        title={armed ? "Tap again to delete" : "Delete chat"}
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full transition",
                          armed
                            ? "bg-danger/15 text-danger"
                            : "text-[rgb(var(--text))]/40 opacity-0 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100",
                        )}
                      >
                        <Icon name={armed ? "check" : "trash"} size={14} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {chats.length > 0 && (
        <div className="px-6 py-6">
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium shadow-sm backdrop-blur-md transition-colors",
              confirmingAll
                ? "bg-danger text-white"
                : "bg-white/70 text-danger hover:bg-white",
            )}
            onClick={() => {
              if (confirmingAll) {
                setConfirmingAll(null);
                onDeleteAll();
              } else {
                setConfirmingAll(true);
              }
            }}
          >
            <Icon name={confirmingAll ? "alert" : "trash"} size={16} />
            {confirmingAll ? "Tap again to delete all" : "Delete history"}
          </button>
        </div>
      )}
    </aside>
  );
}
