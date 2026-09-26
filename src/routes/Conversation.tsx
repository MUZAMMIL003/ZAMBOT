/**
 * A conversation: header, brief, thread and composer on the left; the
 * document panel on the right.
 *
 * Flow:
 *  - Files attached (here, from the start screen, or dropped anywhere) upload
 *    straight away. A question sent while they are still being read waits in
 *    the thread and is asked automatically once reading finishes.
 *  - When reading finishes the brief appears: summary, key facts, starters.
 *  - Answers cite passages; any citation, source card or key fact opens the
 *    document panel at that page with the passage highlighted.
 *  - Sources can be switched off per chat; answers then ignore them.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { BriefCard } from "@/components/chat/BriefCard";
import { Composer, type ComposerHandle } from "@/components/chat/Composer";
import { DocumentPanel, type PanelFocus, type PanelTab } from "@/components/chat/DocumentPanel";
import { FileDropZone } from "@/components/chat/FileDropZone";
import { LiveAnswerSteps } from "@/components/chat/AnswerSteps";
import { Message, type DisplayMessage } from "@/components/chat/Message";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton, SkeletonBubble } from "@/components/ui/Skeleton";
import { ApiError, api, streamAnswer } from "@/lib/api";
import { useChats } from "@/lib/chats-context";
import type {
  Chat,
  DocumentBrief,
  DocumentRecord,
  DocumentStatus,
  KeyFact,
  SandboxRun,
  Source,
  TraceStep,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { StartState } from "@/routes/Start";

const POLL_MS = 2000;
const BRIEF_RETRY_MS = 4000;
const BRIEF_TRIES = 45;

/** Check often at first, then back off; wait longer while a quota is waited out. */
function pollDelay(polls: number, documents: DocumentRecord[]): number {
  if (documents.some((d) => /waiting/i.test(d.live?.label ?? d.status_label ?? ""))) return 8000;
  return polls < 15 ? POLL_MS : polls < 45 ? 4000 : 6000;
}
const PROCESSING: DocumentStatus[] = ["uploaded", "extracting", "analyzing"];

interface Queued {
  id: string;
  text: string;
}

/** Which documents the user switched off, remembered per chat in this browser. */
function useExcluded(chatId: string) {
  const key = `zambot.excluded.${chatId}`;
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setExcluded(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setExcluded(new Set());
    }
  }, [key]);

  const toggle = useCallback(
    (documentId: string) => {
      setExcluded((current) => {
        const next = new Set(current);
        if (next.has(documentId)) next.delete(documentId);
        else next.add(documentId);
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* private mode - the choice lasts for this visit only */
        }
        return next;
      });
    },
    [key],
  );

  return [excluded, toggle] as const;
}

export function Conversation() {
  const { chatId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const handoff = useRef(location.state);
  handoff.current = location.state;
  const { refresh, deleteChat } = useChats();

  const [chat, setChat] = useState<Chat | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [brief, setBrief] = useState<DocumentBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | undefined>();
  const [liveSteps, setLiveSteps] = useState<TraceStep[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [uploading, setUploading] = useState<{ name: string; extension: string }[]>([]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("document");
  const [focus, setFocus] = useState<PanelFocus | null>(null);
  const [excluded, toggleExcluded] = useExcluded(chatId);

  const composer = useRef<ComposerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCount = useRef(0);
  const pinned = useRef(true);

  const documentsProcessing = documents.some((d) => PROCESSING.includes(d.status));
  const processing = uploading.length > 0 || documentsProcessing;
  const readyDocs = useMemo(() => documents.filter((d) => d.status === "ready"), [documents]);
  const ready = readyDocs.length > 0;
  const readyKey = readyDocs.map((d) => d.id).join(",");
  const inUse = readyDocs.filter((d) => !excluded.has(d.id)).length;

  // ------------------------------------------------------------- scrolling
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Only auto-scroll when the user has not deliberately scrolled up.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  useEffect(() => {
    if (pinned.current) scrollToBottom(messages.length > 1);
  }, [messages, scrollToBottom]);

  // ----------------------------------------------------------------- load
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setPanelOpen(false);
    setFocus(null);
    setBrief(null);
    setQueue([]);

    // A chat just created on the start screen is known to be empty: open it at once.
    const fresh = (handoff.current as StartState | null)?.chat;
    if (fresh?.id === chatId) {
      setChat(fresh);
      setDocuments([]);
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [chatRow, docs, history] = await Promise.all([
          api.getChat(chatId),
          api.listDocuments(chatId),
          api.listMessages(chatId),
        ]);
        if (cancelled) return;

        setChat(chatRow);
        setDocuments(docs);
        setMessages(
          history.map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
            sources: m.sources,
            verified: m.verified,
            rewritten: m.rewritten_question,
            sandbox_runs: m.sandbox_runs,
            trace: m.trace,
            related: m.related,
            closest: m.closest,
          })),
        );
        requestAnimationFrame(() => scrollToBottom(false));
      } catch (caught) {
        const e = caught as ApiError;
        if (e.status === 404) navigate("/chats", { replace: true });
        else if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, navigate, scrollToBottom]);

  // The brief, fetched again whenever another document finishes reading.
  // While the server is still writing it, it answers "pending" at once and
  // this checks back every few seconds - no request is ever left hanging.
  useEffect(() => {
    if (loading || !readyKey || processing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const load = () => {
      api
        .brief(chatId)
        .then((result) => {
          if (cancelled) return;
          if (result.pending) {
            tries += 1;
            if (tries < BRIEF_TRIES) timer = setTimeout(load, BRIEF_RETRY_MS);
            else setBrief({ chat_id: chatId, summary: "A summary could not be written right now. Ask anything below.", key_facts: [], questions: [] });
            return;
          }
          setBrief(result);
        })
        .catch(async () => {
          // Older backends have no brief yet: fall back to starter questions.
          try {
            const questions = await api.suggestions(chatId);
            if (!cancelled) setBrief({ chat_id: chatId, summary: "", key_facts: [], questions });
          } catch {
            /* a nicety, never an error the user needs to see */
          }
        });
    };
    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, readyKey, processing, chatId]);

  // ------------------------------------------------------------- polling
  const pollDocuments = useCallback(async () => {
    try {
      const status = await api.documentsStatus(chatId);
      setDocuments((current) => {
        const known = new Set(status.documents.map((d) => d.id));
        return [...status.documents, ...current.filter((d) => !known.has(d.id) && PROCESSING.includes(d.status))];
      });
      setChat((c) => (c ? { ...c, status: status.chat_status } : c));
      if (status.any_processing) {
        pollCount.current += 1;
        pollRef.current = setTimeout(() => void pollDocuments(), pollDelay(pollCount.current, status.documents));
      } else {
        pollRef.current = null;
        pollCount.current = 0;
        await refresh();
      }
    } catch {
      pollRef.current = null; /* transient; the next user action resyncs */
    }
  }, [chatId, refresh]);

  useEffect(() => {
    if (documentsProcessing && !pollRef.current) {
      pollRef.current = setTimeout(() => void pollDocuments(), pollDelay(pollCount.current, documents));
    }
  }, [documentsProcessing, documents, pollDocuments]);

  useEffect(
    () => () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      pollRef.current = null;
    },
    [chatId],
  );

  // ------------------------------------------------------------- asking
  const send = useCallback(
    async (text: string, opts: { regenerate?: boolean; queuedId?: string } = {}) => {
      if (busy) return;
      setError(null);

      const assistantId = `local-assistant-${Date.now()}`;
      setMessages((current) => {
        if (opts.queuedId) {
          return current.map((m) => (m.id === opts.queuedId ? { ...m, queued: false } : m));
        }
        if (opts.regenerate) {
          const last = current.at(-1);
          return last?.role === "assistant" ? current.slice(0, -1) : current;
        }
        return [...current, { id: `local-user-${Date.now()}`, role: "user", content: text }];
      });
      setBusy(true);
      setStage("remembering");
      setLiveSteps([]);
      pinned.current = true;

      const controller = new AbortController();
      abortRef.current = controller;
      let started = false;
      let buffer = "";
      let runs: SandboxRun[] = [];
      // The steps taken so far. Backends that only announce each stage get
      // their steps timed here instead; real "step" events replace those.
      let trace: TraceStep[] = [];
      const timedHere = new Set<string>();
      let running: { stage: string; at: number } | null = { stage: "remembering", at: performance.now() };
      const closeRunning = () => {
        if (running && !trace.some((s) => s.stage === running!.stage)) {
          trace = [...trace, { stage: running.stage, ms: Math.round(performance.now() - running.at), facts: {} }];
          timedHere.add(running.stage);
        }
      };
      const record = (step: TraceStep) => {
        trace = timedHere.has(step.stage)
          ? trace.map((s) => (s.stage === step.stage ? step : s))
          : [...trace.filter((s) => s.stage !== step.stage), step];
        timedHere.delete(step.stage);
        setLiveSteps(trace);
      };

      const upsert = (patch: Partial<DisplayMessage>) => {
        setMessages((current) => {
          const index = current.findIndex((m) => m.id === assistantId);
          if (index === -1) {
            return [
              ...current,
              { id: assistantId, role: "assistant", content: "", streaming: true, ...patch },
            ];
          }
          const next = [...current];
          next[index] = { ...next[index], ...patch };
          return next;
        });
      };

      const documentIds = excluded.size
        ? readyDocs.filter((d) => !excluded.has(d.id)).map((d) => d.id)
        : undefined;

      try {
        for await (const event of streamAnswer(chatId, text, controller.signal, {
          documentIds,
          regenerate: opts.regenerate,
        })) {
          switch (event.type) {
            case "status":
              closeRunning();
              running = { stage: event.stage, at: performance.now() };
              setLiveSteps(trace);
              setStage(event.stage);
              break;
            case "step":
              record({ stage: event.stage, label: event.label, ms: event.ms, facts: event.facts ?? {} });
              if (started) upsert({ trace });
              break;
            case "rewritten":
              upsert({ rewritten: event.question });
              break;
            case "token":
              if (!started) {
                started = true;
                setStreamingId(assistantId);
                setStage(undefined);
              }
              buffer += event.text;
              upsert({ content: buffer, streaming: true, trace });
              break;
            // A failed verification can replace the whole answer.
            case "replace":
              buffer = event.text;
              upsert({ content: buffer, streaming: true });
              break;
            case "sources":
              upsert({ sources: event.sources as Source[] });
              break;
            case "sandbox_start":
              runs = [...runs, { code: event.code, output: null, status: "running", summary: event.summary }];
              upsert({ sandbox_runs: runs });
              break;
            case "sandbox_result":
              if (runs.length > 0) {
                const current = runs[runs.length - 1];
                runs = [
                  ...runs.slice(0, -1),
                  { ...current, output: event.output, status: event.status, summary: event.summary ?? current.summary },
                ];
                upsert({ sandbox_runs: runs });
              }
              break;
            case "done":
              closeRunning();
              running = null;
              upsert({
                trace: event.trace?.length ? event.trace : trace,
                id: event.message_id || assistantId,
                streaming: false,
                verified: event.verified,
                verificationNote: event.verification_note ?? null,
                sources: event.sources as Source[],
                sandbox_runs: event.sandbox_runs ?? runs,
                related: event.related ?? null,
                closest: event.closest ?? null,
              });
              void refresh();
              break;
            case "error":
              throw new ApiError(event.detail, 500);
          }
        }
      } catch (caught) {
        const e = caught as ApiError;
        if (e.name === "AbortError" || controller.signal.aborted) {
          upsert({ content: buffer || "(stopped)", streaming: false });
        } else {
          setError(e.message || "The answer could not be generated.");
          setMessages((c) => c.filter((m) => m.id !== assistantId));
        }
      } finally {
        setBusy(false);
        setStage(undefined);
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [busy, chatId, excluded, readyDocs, refresh],
  );

  const attach = useCallback(
    async (files: File[]) => {
      setError(null);
      setUploading(files.map((file) => ({ name: file.name, extension: file.name.split(".").pop()?.toLowerCase() ?? "" })));
      try {
        const result = await api.uploadDocuments(chatId, files);
        if (result.documents.length) setDocuments((c) => [...c, ...result.documents]);
        if (result.skipped.length) {
          setError(result.skipped.map((s) => `${s.filename}: ${s.reason}`).join(" · "));
        }
        await refresh();
        return result.documents.length > 0;
      } catch (caught) {
        setError((caught as ApiError).message);
        return false;
      } finally {
        setUploading([]);
      }
    },
    [chatId, refresh],
  );

  /** Hold a question until the documents are read. */
  const enqueue = useCallback((text: string) => {
    const id = `local-queued-${Date.now()}`;
    setMessages((c) => [...c, { id, role: "user", content: text, queued: true }]);
    setQueue((q) => [...q, { id, text }]);
    pinned.current = true;
    return id;
  }, []);

  const submit = useCallback(
    async (text: string, files: File[]) => {
      if (files.length) {
        const queuedId = text ? enqueue(text) : null;
        const added = await attach(files);
        if (!added && queuedId) {
          setQueue((q) => q.filter((item) => item.id !== queuedId));
          if (ready) void send(text, { queuedId });
          else setMessages((c) => c.map((m) => (m.id === queuedId ? { ...m, queued: false } : m)));
        }
        return;
      }
      if (!text) return;
      if (processing) enqueue(text);
      else void send(text);
    },
    [attach, processing, ready, enqueue, send],
  );

  // Ask the waiting questions, one at a time, once reading has finished.
  useEffect(() => {
    if (!queue.length || busy || processing || !ready) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    void send(next.text, { queuedId: next.id });
  }, [queue, busy, processing, ready, send]);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) void send(lastUser.content, { regenerate: true });
  }, [messages, send]);

  // Hand-off from the start screen (and "open this file" from Files).
  useEffect(() => {
    if (loading || !location.state) return;
    const state = location.state as StartState & { openDocument?: string };
    let consumed = false;

    if (state.initialFiles?.length || state.initialMessage) {
      void submit(state.initialMessage ?? "", state.initialFiles ?? []);
      consumed = true;
    }
    if (state.openDocument) {
      setFocus({ documentId: state.openDocument, page: 1 });
      setPanelTab("document");
      setPanelOpen(true);
      consumed = true;
    }
    // Clear it so a reload does not upload or ask twice.
    if (consumed) navigate(location.pathname, { replace: true, state: null });
  }, [loading, location.state, location.pathname, navigate, submit]);

  // ------------------------------------------------------------- panel
  const openSource = useCallback((source: Source) => {
    setFocus({ documentId: source.document_id, page: source.page ?? 1, snippet: source.snippet });
    setPanelTab("document");
    setPanelOpen(true);
  }, []);

  const openFact = useCallback((fact: KeyFact) => {
    setFocus({ documentId: fact.document_id, page: fact.page ?? 1, snippet: fact.value });
    setPanelTab("document");
    setPanelOpen(true);
  }, []);

  const openSources = useCallback(() => {
    setPanelTab("sources");
    setPanelOpen(true);
  }, []);

  const removeDocument = useCallback(
    async (documentId: string) => {
      try {
        const result = await api.deleteDocument(documentId);
        setDocuments((c) => c.filter((d) => d.id !== documentId));
        setChat((c) => (c ? { ...c, status: result.chat_status as Chat["status"] } : c));
        setBrief(null);
        await refresh();
      } catch (caught) {
        setError((caught as ApiError).message);
      }
    },
    [refresh],
  );

  const retryDocument = useCallback(
    async (documentId: string) => {
      try {
        await api.retryDocument(documentId);
        setDocuments(await api.listDocuments(chatId));
      } catch (caught) {
        setError((caught as ApiError).message);
      }
    },
    [chatId],
  );

  // ------------------------------------------------------------- render
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 px-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex-1 space-y-4 px-4 py-6">
          <SkeletonBubble />
          <div className="flex justify-end">
            <Skeleton className="h-12 w-52 rounded-card" />
          </div>
          <SkeletonBubble />
        </div>
      </div>
    );
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex h-full min-h-0">
      <FileDropZone
        onFiles={(files) => composer.current?.addFiles(files)}
        disabled={busy}
        className="flex min-w-0 flex-1 flex-col"
      >
        <PageHeader
          title={chat?.title ?? "Chat"}
          subtitle={
            processing
              ? "Reading documents…"
              : readyDocs.length
                ? `${readyDocs.length} document${readyDocs.length === 1 ? "" : "s"}${inUse < readyDocs.length ? ` · ${inUse} in use` : ""}`
                : "Waiting for a document"
          }
          right={
            <>
              <button
                type="button"
                onClick={() => (panelOpen && panelTab === "sources" ? setPanelOpen(false) : openSources())}
                aria-label="Sources"
                aria-pressed={panelOpen}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-full text-[13px] font-medium shadow-sm transition",
                  "w-9 sm:w-auto sm:px-3.5",
                  panelOpen ? "bg-white ring-1 ring-black/15" : "bg-white/70 hover:bg-white",
                )}
              >
                <Icon name="files" size={15} />
                <span className="hidden sm:inline">Sources</span>
              </button>
              <ShareButton title={chat?.title ?? "Zambot chat"} />
              <MoreMenu
                canClear={messages.length > 0 && !busy}
                onClear={async () => {
                  await api.clearMessages(chatId);
                  setMessages([]);
                  await refresh();
                }}
                onDelete={() => deleteChat(chatId)}
              />
            </>
          }
        />

        {/* thread */}
        <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto max-w-3xl space-y-5 px-4 pb-6 pt-3",
              documents.length === 0 && messages.length === 0 && "flex min-h-full flex-col justify-center",
            )}
          >
            <BriefCard
              documents={documents}
              uploading={uploading}
              brief={brief}
              hasMessages={messages.length > 0}
              onAsk={(q) => void submit(q, [])}
              onOpenFact={openFact}
              onOpenSources={openSources}
              onRetry={(id) => void retryDocument(id)}
            />

            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                isLast={message === lastAssistant && !busy}
                onOpenSource={openSource}
                onAsk={(q) => void submit(q, [])}
                onRegenerate={message === lastAssistant && !busy && !queue.length ? regenerate : undefined}
              />
            ))}

            <AnimatePresence>{busy && !streamingId && <LiveAnswerSteps steps={liveSteps} stage={stage} />}</AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-[13.5px] text-danger"
              >
                <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>
        </div>

        <Composer
          ref={composer}
          onSubmit={(text, files) => void submit(text, files)}
          busy={busy}
          onStop={() => abortRef.current?.abort()}
          textDisabled={!ready && !processing}
          attachDisabled={busy}
          highlightAttach={documents.length === 0 && !busy}
          placeholder={
            processing ? "Ask while it reads…" : ready ? "Ask a question…" : "Attach a document to start"
          }
        />
      </FileDropZone>

      <DocumentPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        tab={panelTab}
        onTab={setPanelTab}
        documents={documents}
        focus={focus}
        onFocus={setFocus}
        excluded={excluded}
        onToggleIncluded={toggleExcluded}
        onAddFiles={(files) => void attach(files)}
        onRemove={(id) => void removeDocument(id)}
        onRetry={(id) => void retryDocument(id)}
      />
    </div>
  );
}

// ------------------------------------------------------------ header bits
const HEADER_BUTTON =
  "flex h-9 items-center justify-center gap-2 rounded-full bg-white/70 text-[13px] font-medium text-[rgb(var(--text))] shadow-sm transition hover:bg-white";

/** Native share sheet where there is one (phones), otherwise copy the link. */
function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard blocked - nothing useful to show */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : "Share this chat"}
      className={cn(HEADER_BUTTON, "w-9 md:w-auto md:px-3.5")}
    >
      <Icon name={copied ? "check" : "share"} size={15} />
      <span className="hidden md:inline">{copied ? "Copied" : "Share"}</span>
    </button>
  );
}

/** Chat actions. Destructive items ask for a second tap instead of a dialog. */
function MoreMenu({
  canClear,
  onClear,
  onDelete,
}: {
  canClear: boolean;
  onClear: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<"clear" | "delete" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setConfirming(null);
      return;
    }
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const run = async (action: "clear" | "delete") => {
    if (confirming !== action) {
      setConfirming(action);
      return;
    }
    setOpen(false);
    await (action === "clear" ? onClear() : onDelete());
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(HEADER_BUTTON, "w-9")}
      >
        <Icon name="moreHorizontal" size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-30 w-52 origin-top-right overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 shadow-lifted"
          >
            <button
              type="button"
              role="menuitem"
              disabled={!canClear}
              onClick={() => void run("clear")}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon name="refresh" size={15} />
              {confirming === "clear" ? "Tap again to clear" : "Clear messages"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void run("delete")}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-danger transition-colors hover:bg-danger/10"
            >
              <Icon name="trash" size={15} />
              {confirming === "delete" ? "Tap again to delete" : "Delete chat"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
