/**
 * File picker. Drag-and-drop is the desktop affordance; on touch the whole
 * panel is one large tap target that opens the system picker, because there is
 * nothing to drag on a phone.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState, type DragEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPTED = [
  "pdf", "docx", "txt", "md", "csv", "tsv",
  "xlsx", "xls", "pptx", "json", "html", "htm",
];
const MAX_MB = 20;

interface Rejected {
  name: string;
  reason: string;
}

export function Dropzone({
  onFiles,
  disabled = false,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  // Nested dragenter/dragleave fire constantly; count them or the border flickers.
  const depth = useRef(0);

  const validate = useCallback(
    (files: File[]) => {
      const accepted: File[] = [];
      const problems: Rejected[] = [];

      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ACCEPTED.includes(extension)) {
          problems.push({ name: file.name, reason: `.${extension} is not supported` });
        } else if (file.size > MAX_MB * 1024 * 1024) {
          problems.push({
            name: file.name,
            reason: `${formatBytes(file.size)} exceeds the ${MAX_MB}MB limit`,
          });
        } else if (file.size === 0) {
          problems.push({ name: file.name, reason: "File is empty" });
        } else {
          accepted.push(file);
        }
      }

      setRejected(problems);
      if (accepted.length) onFiles(accepted);
    },
    [onFiles],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (disabled) return;
      validate(Array.from(event.dataTransfer.files || []));
    },
    [disabled, validate],
  );

  return (
    <div className="space-y-3">
      <motion.div
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Choose documents to upload"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        animate={{ scale: dragging ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-[24px] text-center transition-all duration-300",
          compact ? "px-5 py-7" : "px-6 py-14",
          dragging
            ? "bg-[rgb(var(--accent))]/15 shadow-inner"
            : "bg-white/40 backdrop-blur-md shadow-sm hover:bg-white/60",
          disabled && "pointer-events-none opacity-50",
        )}
      >


        <motion.div
          animate={{ y: dragging ? -3 : 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          className="relative"
        >
          <span
            aria-hidden
            className={cn(
              "mx-auto grid place-items-center rounded-pill transition-colors duration-300",
              compact ? "h-11 w-11" : "h-16 w-16",
              dragging
                ? "bg-[rgb(var(--accent))] text-white"
                : "bg-[rgb(var(--accent))]/12 text-[rgb(var(--accent-bright))]",
            )}
          >
            <Icon name="upload" size={compact ? 19 : 26} />
          </span>

          <p
            className={cn(
              "mt-4 font-semibold tracking-tight",
              compact ? "text-[15px]" : "text-[18px]",
            )}
          >
            {dragging
              ? "Drop to upload"
              : compact
                ? "Add another document"
                : "Add your documents"}
          </p>
          {!dragging && (
            <>
              <p className="mt-1.5 text-[13px] text-muted">
                <span className="hidden sm:inline">Drag them here, or </span>
                <span className="text-[rgb(var(--accent-bright))]">
                  <span className="sm:hidden">Tap to </span>browse
                </span>
              </p>
              <p className="mx-auto mt-3 max-w-[30ch] text-[11.5px] leading-relaxed text-muted">
                PDF, DOCX, XLSX, PPTX, CSV, TXT, MD · up to {MAX_MB}MB each
              </p>
            </>
          )}
        </motion.div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(event) => {
            validate(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
      </motion.div>

      <AnimatePresence>
        {rejected.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            {rejected.map((file) => (
              <li
                key={file.name}
                className="flex items-start gap-2 rounded-row border border-danger/25 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger"
              >
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">{file.name}</span> — {file.reason}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
