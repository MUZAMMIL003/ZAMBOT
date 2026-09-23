/**
 * Per-file ingestion progress: Extracting -> Analyzing -> Ready.
 *
 * The stage is carried by a filled track *and* a written label, never colour
 * alone, and the failure state includes a recovery action.
 */
import { motion } from "framer-motion";

import { Icon } from "@/components/ui/Icon";
import type { DocumentRecord } from "@/lib/types";
import { cn, fileLabel, formatBytes } from "@/lib/utils";

export function FileStatus({
  document,
  onRetry,
  onRemove,
}: {
  document: DocumentRecord;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const failed =
    document.status === "failed" || document.status === "manual_review";
  const done = document.status === "ready";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card p-4 transition-colors duration-300",
        done && "border-positive/30",
        failed && "border-danger/30",
        !done && !failed && "processing-card border-[rgb(var(--border-strong))]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-pill font-mono text-[9.5px] font-bold",
            done
              ? "bg-positive/15 text-positive"
              : failed
                ? "bg-danger/15 text-danger"
                : "bg-[rgb(var(--accent))]/12 text-[rgb(var(--accent-bright))]",
          )}
        >
          {fileLabel(document.extension)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[14px] font-medium">{document.filename}</p>
            <span className="shrink-0 text-[11.5px] text-muted">
              {formatBytes(document.size_bytes)}
            </span>
          </div>

          {!failed ? (
            <div className="mt-4 flex items-center h-[28px]">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-[13px] font-medium text-positive"
                >
                  <Icon name="sparkle" size={16} />
                  Ready
                </motion.div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[rgb(var(--text))]">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--text))] opacity-20"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[rgb(var(--text))]"></span>
                    </span>
                    {document.status === "uploaded" || document.status === "extracting"
                      ? "Reading document..."
                      : "Analyzing contents..."}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-danger">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
              <p>
                {document.status === "manual_review"
                  ? "We could not read this file automatically."
                  : "Processing failed."}
                {document.error && (
                  <span className="mt-1 block text-muted">
                    {document.error.split("\n")[0].slice(0, 160)}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[11.5px] text-muted">
              {done
                ? `${document.page_count} page${
                    document.page_count === 1 ? "" : "s"
                  } · ${document.chunk_count} chunks indexed`
                : document.status_detail || document.status_label}
            </p>

            <div className="flex shrink-0 gap-1">
              {failed && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(document.id)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border border-[rgb(var(--border-strong))] px-3 text-[12.5px] transition-colors hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent-bright))]"
                >
                  <Icon name="refresh" size={13} />
                  Try again
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(document.id)}
                  aria-label={`Remove ${document.filename}`}
                  className="grid h-9 w-9 place-items-center rounded-pill text-muted transition-colors hover:bg-[rgb(var(--border))] hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
