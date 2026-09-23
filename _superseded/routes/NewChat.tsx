/**
 * A blank chat. Nothing is created until the user types or attaches: then the
 * chat is created, and the message or files are handed to the conversation
 * screen through router state, which sends or uploads them on arrival.
 */
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/routes/Conversation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError, api } from "@/lib/api";
import { useChats } from "@/lib/chats-context";

export function NewChat() {
  const navigate = useNavigate();
  const { refresh } = useChats();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startChat = useCallback(
    async (payload: { message?: string; files?: File[] }) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      
      try {
        let title: string | undefined;
        if (payload.files && payload.files.length > 0) {
          title = payload.files[0].name
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]+/g, " ")
            .trim()
            .substring(0, 40);
        } else if (payload.message) {
          title = payload.message.trim().split(/\s+/).slice(0, 6).join(" ").substring(0, 40);
        }
        if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

        const chat = await api.createChat(title);
        await refresh();
        
        // Navigate to the newly created chat, passing the initial action via state
        navigate(`/chats/${chat.id}`, {
          replace: true,
          state: {
            initialMessage: payload.message,
            initialFiles: payload.files,
          },
        });
      } catch (caught) {
        setError((caught as ApiError).message || "Could not start conversation.");
        setBusy(false);
      }
    },
    [busy, navigate, refresh]
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="New Chat" subtitle="Type a question or attach a file" back backTo="/chats" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 flex min-h-full flex-col justify-center">
          <EmptyState
            processing={false}
            suggestions={[]}
            onPick={(q) => void startChat({ message: q })}
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-[13.5px] text-danger mt-6"
            >
              <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </div>

      <Composer
        onSend={(text) => void startChat({ message: text })}
        onAttach={(files) => void startChat({ files })}
        busy={busy}
        disabled={busy}
        attachDisabled={busy}
        placeholder="What would you like to explore?"
      />
    </div>
  );
}

