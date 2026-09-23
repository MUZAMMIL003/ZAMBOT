/**
 * Home: greeting, quick actions, then the chat list as grouped rows.
 *
 * Bottom padding clears the tab bar - a fixed bar must always reserve space in
 * the scroll container, or the last row sits underneath it.
 */
import { motion } from "framer-motion";

import { Icon } from "@/components/ui/Icon";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { ListCard, ListRow, SectionLabel } from "@/components/ui/List";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useChats } from "@/lib/chats-context";
import { relativeTime } from "@/lib/utils";

export function Home() {
  const { chats, loading } = useChats();

  return (
    <div className="h-full overflow-y-auto pb-28 lg:pb-8">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 safe-t sm:px-6 sm:pt-7">
        {/* greeting */}
        <header className="mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
          <AnimatedLogo className="mb-5 w-[150px] text-[rgb(var(--text))] sm:w-[180px]" />
          <h1 className="text-[24px] font-semibold tracking-tight text-[rgb(var(--text))]">
            Welcome to Zambot
          </h1>
          <p className="text-[14px] text-[rgb(var(--text))]/70 mt-1">
            What are we reading today?
          </p>
        </header>

        {/* quick actions */}
        <div className="mt-7">
          <SectionLabel>Start something</SectionLabel>
          <ListCard>
            <ListRow
              icon="plus"
              label="New chat"
              detail="Add a document and start asking"
              to="/chats/new"
            />
            <ListRow
              icon="folder"
              label="Your files"
              detail="Everything you have uploaded"
              to="/chats/files"
            />
            <ListRow
              icon="lines"
              label="How it works"
              detail="Grounded answers with page citations"
              to="/"
            />
          </ListCard>
        </div>

        {/* chats */}
        <div className="mt-7">
          <SectionLabel
            action={
              !loading && chats.length > 0 ? (
                <span className="text-[13px] text-muted">
                  {chats.length} total
                </span>
              ) : undefined
            }
          >
            Your chats
          </SectionLabel>

          {loading ? (
            <SkeletonRows count={4} />
          ) : chats.length === 0 ? (
            <EmptyChats />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ListCard>
                {chats.map((chat) => (
                  <ListRow
                    key={chat.id}
                    icon={chat.status === "pending" ? "upload" : "message"}
                    label={chat.title}
                    detail={
                      chat.status === "pending"
                        ? "Waiting for a document"
                        : `${chat.document_count} document${
                            chat.document_count === 1 ? "" : "s"
                          } · ${relativeTime(chat.last_message_at || chat.updated_at)}`
                    }
                    to={`/chats/${chat.id}`}
                  />
                ))}
              </ListCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChats() {
  return (
    <div className="rounded-3xl border border-white/40 bg-white/40 px-6 py-11 text-center shadow-sm backdrop-blur-md">
      <span
        aria-hidden
        className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-[rgb(var(--surface))] text-[rgb(var(--accent))]"
      >
        <Icon name="upload" size={24} />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold">No chats yet</h3>
      <p className="mx-auto mt-2 max-w-[32ch] text-[13.5px] leading-relaxed text-[rgb(var(--text))]/70">
        Every chat starts with a document. Add one and Zambot will read it,
        index every page, and answer from it.
      </p>
    </div>
  );
}
