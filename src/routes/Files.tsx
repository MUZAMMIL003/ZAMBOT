/**
 * Every document across every chat, newest first.
 *
 * Built from the chat list already in context plus one documents call per
 * chat - there is no cross-chat endpoint, and a handful of parallel reads is
 * cheaper than adding one.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { ListCard, ListRow, SectionLabel } from "@/components/ui/List";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { useChats } from "@/lib/chats-context";
import type { DocumentRecord } from "@/lib/types";
import { formatBytes, relativeTime } from "@/lib/utils";

interface Row extends DocumentRecord {
  chatTitle: string;
}

export function Files() {
  const { chats, loading: chatsLoading } = useChats();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (chatsLoading) return;
    let cancelled = false;

    void (async () => {
      const results = await Promise.all(
        chats.map(async (chat) => {
          try {
            const documents = await api.listDocuments(chat.id);
            return documents.map((d) => ({ ...d, chatTitle: chat.title }));
          } catch {
            return [] as Row[];
          }
        }),
      );
      if (cancelled) return;
      setRows(
        results
          .flat()
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [chats, chatsLoading]);

  const totalBytes = useMemo(
    () => (rows ?? []).reduce((sum, row) => sum + row.size_bytes, 0),
    [rows],
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Your files" subtitle="Every document, across every chat" />

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <SectionLabel
            action={
              rows && rows.length > 0 ? (
                <span className="text-[13px] text-muted">
                  {formatBytes(totalBytes)}
                </span>
              ) : undefined
            }
          >
            {rows === null
              ? "Gathering documents…"
              : rows.length === 0
                ? "Nothing yet"
                : `${rows.length} document${rows.length === 1 ? "" : "s"}`}
          </SectionLabel>

          {rows === null ? (
            <SkeletonRows count={5} />
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-white/40 bg-white/40 px-6 py-11 text-center shadow-sm backdrop-blur-md">
              <span
                aria-hidden
                className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-white text-[rgb(var(--text))]"
              >
                <Icon name="folder" size={24} />
              </span>
              <h3 className="mt-4 text-[16px] font-semibold">No documents yet</h3>
              <p className="mx-auto mt-2 max-w-[32ch] text-[13.5px] leading-relaxed text-muted">
                Start a chat and upload a file. Everything you add shows up here.
              </p>
            </div>
          ) : (
            <ListCard>
              {rows.map((row) => (
                <ListRow
                  key={row.id}
                  label={row.filename}
                  detail={`${row.chatTitle} · ${formatBytes(row.size_bytes)} · ${
                    row.status === "ready"
                      ? `${row.page_count} page${row.page_count === 1 ? "" : "s"}`
                      : row.status_label
                  } · ${relativeTime(row.created_at)}`}
                  onClick={() =>
                    navigate(`/chats/${row.chat_id}`, {
                      state: row.status === "ready" ? { openDocument: row.id } : undefined,
                    })
                  }
                  leading={<FileTypeIcon extension={row.extension} size="lg" />}
                />
              ))}
            </ListCard>
          )}

          {rows && rows.length > 0 && (
            <p className="mt-4 px-1 text-[12px] text-muted">
              Tap a document to open it inside the chat it belongs to.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

