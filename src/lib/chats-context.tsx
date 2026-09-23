/**
 * Shared chat-list state for every /chats route. AppShell owns the list; the
 * pages and rails read it and call the actions here, so a delete anywhere
 * updates the Home list and both rails at once.
 */
import { createContext, useContext, type ReactNode } from "react";

import type { Chat } from "./types";

export interface ChatsContextValue {
  chats: Chat[];
  loading: boolean;
  refresh: () => Promise<void>;
  setChats: (chats: Chat[]) => void;
  /** Optimistic delete; leaves the chat if it was open. */
  deleteChat: (chatId: string) => Promise<void>;
  /** Deletes every chat. */
  deleteAllChats: () => Promise<void>;
  /** Opens the sidebar drawer (below lg, where it is hidden). */
  openSidebar: () => void;
}

const ChatsContext = createContext<ChatsContextValue>({
  chats: [],
  loading: true,
  refresh: async () => {},
  setChats: () => {},
  deleteChat: async () => {},
  deleteAllChats: async () => {},
  openSidebar: () => {},
});

export function ChatsProvider({
  value,
  children,
}: {
  value: ChatsContextValue;
  children: ReactNode;
}) {
  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
}

export function useChats() {
  return useContext(ChatsContext);
}
