/**
 * Makes a whole screen a drop target. Files dragged anywhere over it show a
 * frosted "drop to add" layer, and land in the composer as chips.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type DragEvent, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

export function FileDropZone({
  onFiles,
  disabled = false,
  label = "Drop to add to this chat",
  className,
  children,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  // dragenter/dragleave fire for every child; count them to know when we left.
  const depth = useRef(0);

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        if (disabled) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setActive(false);
      }}
      onDrop={(event) => {
        if (disabled || !hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {children}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-[28px] border-2 border-dashed border-black/25 bg-white/70 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-[rgb(var(--text))] shadow-sm ring-1 ring-black/5">
                <Icon name="upload" size={24} />
              </span>
              <p className="text-[16px] font-semibold">{label}</p>
              <p className="text-[13px] text-muted">PDF, Word, Excel, PowerPoint, CSV, text or HTML</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
