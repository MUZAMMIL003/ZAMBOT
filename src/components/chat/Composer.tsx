/**
 * The composer, modelled on ChatGPT / Claude: attach first, then ask.
 *
 * Picked, pasted or dropped files wait as chips inside the pill until the
 * user presses send, so a file and the question about it go together. Typing
 * and attaching are disabled separately: a chat with no ready document cannot
 * be asked anything, but it can always take a file.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { FileTypeIcon, Icon } from "@/components/ui/Icon";
import { ACCEPTED_EXTENSIONS, ACCEPTED_LABEL, cn, formatBytes, truncate } from "@/lib/utils";

const MAX_HEIGHT = 160;
const MAX_FILES = 10;
const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// The Web Speech API is not in the TS DOM lib, and only Chromium and Safari
// ship it - the mic is hidden everywhere else.
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

function speechRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface ComposerHandle {
  /** Stage files as chips - used by page-level drag and drop. */
  addFiles: (files: File[]) => void;
  focus: () => void;
}

interface ComposerProps {
  onSubmit: (text: string, files: File[]) => void;
  /** Disables typing. Files can still be attached and sent on their own. */
  textDisabled?: boolean;
  attachDisabled?: boolean;
  /** Draws attention to the paperclip when a file is the only way forward. */
  highlightAttach?: boolean;
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
  /** `hero` = the large centred composer on the start screen. */
  variant?: "dock" | "hero";
  autoFocus?: boolean;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  {
    onSubmit,
    textDisabled = false,
    attachDisabled = false,
    highlightAttach = false,
    busy = false,
    onStop,
    placeholder = "Ask me something…",
    variant = "dock",
    autoFocus = false,
  },
  ref,
) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const [canDictate] = useState(() => speechRecognition() !== null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(resize, [value, resize]);
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => {
    if (autoFocus && window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (attachDisabled || !incoming.length) return;
      const accepted = incoming.filter((f) => ACCEPTED_EXTENSIONS.includes(extensionOf(f.name)));
      const rejected = incoming.length - accepted.length;
      setFiles((current) => {
        const names = new Set(current.map((f) => f.name));
        return [...current, ...accepted.filter((f) => !names.has(f.name))].slice(0, MAX_FILES);
      });
      if (rejected) {
        setNotice(
          `${rejected} file${rejected === 1 ? "" : "s"} skipped - Zambot reads ${ACCEPTED_LABEL}.`,
        );
      }
      textareaRef.current?.focus();
    },
    [attachDisabled],
  );

  useImperativeHandle(ref, () => ({ addFiles, focus: () => textareaRef.current?.focus() }), [addFiles]);

  const trimmed = value.trim();
  const canSend = !busy && (files.length > 0 || (Boolean(trimmed) && !textDisabled));

  const submit = useCallback(() => {
    if (!canSend) return;
    recognitionRef.current?.stop();
    onSubmit(textDisabled ? "" : trimmed, files);
    setValue("");
    setFiles([]);
    requestAnimationFrame(resize);
  }, [canSend, onSubmit, textDisabled, trimmed, files, resize]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = Array.from(event.clipboardData.files);
      if (pasted.length) {
        event.preventDefault();
        addFiles(pasted);
      }
    },
    [addFiles],
  );

  const toggleDictation = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = speechRecognition();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    const before = value.trim();
    recognition.onresult = (event) => {
      const heard = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (heard) setValue(before ? `${before} ${heard}` : heard);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      textareaRef.current?.focus();
    };
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [listening, value]);

  const hero = variant === "hero";
  const effectivePlaceholder = listening
    ? "Listening…"
    : textDisabled && files.length
      ? "Press send to add these files"
      : placeholder;

  return (
    <div className={cn("shrink-0", hero ? "w-full" : "px-3 pb-3 pt-2 safe-b lg:px-6 lg:pb-6")}>
      <div className={cn("mx-auto flex flex-col gap-2", hero ? "max-w-2xl" : "max-w-3xl")}>
        <AnimatePresence>
          {notice && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-3 rounded-xl bg-white/80 px-3 py-2 text-[12.5px] text-[rgb(var(--text))]/80 shadow-sm"
            >
              {notice}
            </motion.p>
          )}
        </AnimatePresence>

        <div
          className={cn(
            "w-full border backdrop-blur-[20px] transition-colors duration-200",
            hero
              ? "rounded-[28px] bg-white/60 p-2.5 shadow-[0_12px_48px_rgba(60,40,110,0.10)]"
              : "rounded-[28px] bg-white/40 px-2 py-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.04)]",
            focused ? "border-white/80 bg-white/70" : "border-white/50",
          )}
        >
          {/* staged files */}
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2 px-1.5 pb-1.5 pt-1" aria-label="Files to send">
              {files.map((file) => (
                <motion.li
                  key={file.name}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex max-w-full items-center gap-2 rounded-2xl border border-black/5 bg-white/90 py-1.5 pl-1.5 pr-1 shadow-sm"
                >
                  <FileTypeIcon extension={extensionOf(file.name)} />
                  <span className="min-w-0">
                    <span className="block max-w-[180px] truncate text-[12.5px] font-medium">
                      {truncate(file.name, 32)}
                    </span>
                    <span className="block text-[11px] text-muted">{formatBytes(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((c) => c.filter((f) => f !== file))}
                    aria-label={`Remove ${file.name}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-[rgb(var(--text))]"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-1.5">
            <div className="flex h-11 items-center px-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={attachDisabled}
                aria-label="Attach documents"
                title="Attach documents (or drop them anywhere)"
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
                  highlightAttach && !files.length
                    ? "bg-white text-[rgb(var(--text))] shadow-sm ring-1 ring-black/10"
                    : "text-muted hover:bg-[rgb(var(--row))] hover:text-[rgb(var(--text))]",
                )}
              >
                {highlightAttach && !files.length && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-listen-ring rounded-full border border-black/20"
                  />
                )}
                <Icon name="paperclip" size={18} />
              </button>
              {canDictate && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  disabled={textDisabled}
                  aria-label={listening ? "Stop dictation" : "Dictate message"}
                  aria-pressed={listening}
                  title={listening ? "Stop dictation" : "Dictate message"}
                  className={cn(
                    "relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
                    listening
                      ? "bg-danger/15 text-danger"
                      : "text-muted hover:bg-[rgb(var(--row))] hover:text-[rgb(var(--text))]",
                  )}
                >
                  {listening && (
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-listen-ring rounded-full border border-danger/50"
                    />
                  )}
                  <Icon name="mic" size={18} />
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept={ACCEPT}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                addFiles(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />

            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={textDisabled}
              placeholder={effectivePlaceholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Message"
              className={cn(
                "max-h-[160px] min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-3 pr-2",
                // 16px on touch screens stops iOS zooming into the field.
                "text-[16px] leading-[1.45] outline-none sm:text-[15px]",
                "placeholder:font-medium placeholder:text-[rgb(var(--text-muted))]",
                "placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap",
                "disabled:cursor-not-allowed",
              )}
            />

            {busy && onStop ? (
              <motion.button
                type="button"
                onClick={onStop}
                whileTap={{ scale: 0.92 }}
                aria-label="Stop generating"
                className="ctrl mb-1 mr-1 h-10 w-10"
              >
                <Icon name="stop" size={16} />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={submit}
                disabled={!canSend}
                animate={{ scale: canSend ? 1 : 0.95 }}
                whileHover={canSend ? { scale: 1.05 } : undefined}
                whileTap={canSend ? { scale: 0.93 } : undefined}
                transition={{ type: "spring", stiffness: 430, damping: 24 }}
                aria-label="Send"
                className={cn(
                  "mb-1 mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-200",
                  canSend
                    ? "bg-[#2B2B30] text-white hover:bg-[#1F1F23]"
                    : "bg-black/[0.07] text-[rgb(var(--text))]/35",
                )}
              >
                <Icon name="arrowUp" size={19} strokeWidth={2.1} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
