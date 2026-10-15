/**
 * Shell for every /chats route: the sidebar on the left and the page. The
 * conversation screen adds its own document panel on the right.
 *
 *   lg and up : sidebar column + page
 *   below lg  : page only; the sidebar is a drawer opened from the ☰ button
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Sidebar } from "@/components/chat/Sidebar";
import { ZMark } from "@/components/ui/Working";
import { api } from "@/lib/api";
import { ChatsProvider } from "@/lib/chats-context";
import { useEnsureSession } from "@/lib/providers";
import type { Chat } from "@/lib/types";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, status, retry } = useEnsureSession();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Any navigation closes the drawer.
  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const refresh = useCallback(async () => {
    try {
      setChats(await api.listChats());
    } catch {
      /* the page surfaces the error; the list stays as it was */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const deleteChat = useCallback(
    async (id: string) => {
      const previous = chats;
      setChats((current) => current.filter((chat) => chat.id !== id));
      try {
        await api.deleteChat(id);
        if (chatId === id) navigate("/chats", { replace: true });
      } catch {
        setChats(previous);
      }
    },
    [chats, chatId, navigate],
  );

  const deleteAllChats = useCallback(async () => {
    const ids = chats.map((chat) => chat.id);
    setChats([]);
    try {
      await Promise.all(ids.map((id) => api.deleteChat(id)));
      if (chatId) navigate("/chats", { replace: true });
    } finally {
      await refresh();
    }
  }, [chats, chatId, navigate, refresh]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const value = useMemo(
    () => ({ chats, loading, refresh, setChats, deleteChat, deleteAllChats, openSidebar }),
    [chats, loading, refresh, deleteChat, deleteAllChats, openSidebar],
  );

  if (!user) {
    return (
      <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6 mesh-bg">
        <div className="relative flex flex-col items-center gap-3 text-center">
          {status === "unavailable" ? (
            <>
              <p className="text-[15px] font-medium">Zambot's server is not answering</p>
              <p className="max-w-[34ch] text-[13.5px] text-muted">It may be waking up after a rest. This usually takes under a minute.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 h-11 rounded-full bg-[#2B2B30] px-6 text-[14.5px] font-medium text-white hover:bg-[#1F1F23]"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <ZMark size={24} />
              <p className="text-[14px] text-muted">Opening your workspace…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <ChatsProvider value={value}>
      <div className="flex h-dvh overflow-hidden mesh-bg">
        <Sidebar
          chats={chats}
          loading={loading}
          activeChatId={chatId}
          onDeleteChat={(id) => void deleteChat(id)}
          open={sidebarOpen}
          onClose={closeSidebar}
        />

        <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
    </ChatsProvider>
  );
}
