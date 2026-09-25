/**
 * Start screen (/chats and /chats/new) - Home and New Chat in one, the way
 * ChatGPT and Claude open: one big composer, a line of promise, and ways back
 * into existing work. Drop files anywhere on the page.
 *
 * Nothing is created until the user sends. Then the chat is created and the
 * message and files travel to the conversation screen in router state, which
 * uploads them and answers the question once reading finishes.
 */
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Composer, type ComposerHandle } from "@/components/chat/Composer";
import { FileDropZone } from "@/components/chat/FileDropZone";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { MenuButton } from "@/components/ui/PageHeader";
import { ApiError, IS_DEMO, api } from "@/lib/api";
import { useChats } from "@/lib/chats-context";
import type { Chat } from "@/lib/types";
import { ACCEPTED_LABEL, cn, relativeTime } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface StartState {
  chat?: Chat;
  initialMessage?: string;
  initialFiles?: File[];
}

function titleFor(text: string, files: File[]): string | undefined {
  let title: string | undefined;
  if (files.length) {
    title = files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  } else if (text) {
    title = text.split(/\s+/).slice(0, 6).join(" ");
  }
  if (!title) return undefined;
  title = title.slice(0, 40);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function Start() {
  const navigate = useNavigate();
  const { chats, refresh } = useChats();
  const composer = useRef<ComposerHandle>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (text: string, files: File[]) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const chat = await api.createChat(titleFor(text, files));
        await refresh();
        const state: StartState = { chat, initialMessage: text || undefined, initialFiles: files };
        navigate(`/chats/${chat.id}`, { replace: true, state });
      } catch (caught) {
        setError((caught as ApiError).message || "Could not start a chat.");
        setBusy(false);
      }
    },
    [busy, navigate, refresh],
  );

  const samples = IS_DEMO
    ? chats.filter((c) => c.id.startsWith("demo-chat-") && c.status === "active").slice(0, 3)
    : [];
  const recent = chats.slice(0, 4);

  return (
    <FileDropZone
      onFiles={(files) => composer.current?.addFiles(files)}
      label="Drop to start a chat"
      className="flex h-full flex-col"
    >
      <div className="flex items-center px-3 pt-3 safe-t lg:hidden">
        <MenuButton />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex flex-col items-center text-center"
          >
            <AnimatedLogo className="w-[118px] text-[rgb(var(--text))] sm:w-[140px]" />
            <h1 className="mt-6 text-[26px] font-semibold tracking-tight sm:text-[32px]">
              What are we reading today?
            </h1>
            <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-relaxed text-muted sm:text-[15px]">
              Drop in a document and ask anything. Every answer quotes the page it came from.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            className="mt-8"
          >
            <Composer
              ref={composer}
              variant="hero"
              autoFocus
              busy={busy}
              attachDisabled={busy}
              onSubmit={(text, files) => void start(text, files)}
              placeholder="Add a file and ask…"
            />
            {error && (
              <p role="alert" className="mt-3 text-center text-[13px] text-danger">
                {error}
              </p>
            )}
            <p className="mt-3 text-center text-[12px] text-muted">
              {ACCEPTED_LABEL} · drop files anywhere
            </p>
          </motion.div>

          {samples.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-10"
            >
              <h2 className="mb-3 text-center text-[12px] font-medium uppercase tracking-wider text-[rgb(var(--text))]/45">
                Or try a sample
              </h2>
              <div className="flex flex-wrap justify-center gap-2">
                {samples.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => navigate(`/chats/${chat.id}`)}
                    className="flex items-center gap-2 rounded-full border border-white/60 bg-white/60 py-1.5 pl-1.5 pr-4 text-[13.5px] font-medium shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    <FileTypeIcon extension={chat.documents[0]?.extension ?? "pdf"} size="sm" className="rounded-full" />
                    {chat.title}
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {/* On desktop the sidebar already lists every chat. */}
          {recent.length > 0 && (
            <section className="mt-10 lg:hidden">
              <h2 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[rgb(var(--text))]/45">
                Continue
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {recent.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => navigate(`/chats/${chat.id}`)}
                    className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/50 p-3 text-left shadow-sm backdrop-blur-md transition hover:bg-white/80"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                        chat.status === "pending" ? "bg-black/5 text-muted" : "bg-white text-[rgb(var(--text))]",
                      )}
                    >
                      <Icon name={chat.status === "pending" ? "upload" : "message"} size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{chat.title}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {chat.status === "pending"
                          ? "Awaiting a document"
                          : relativeTime(chat.last_message_at || chat.updated_at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </FileDropZone>
  );
}
