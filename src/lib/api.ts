/**
 * Thin client for the Zambot backend.
 *
 * The base URL comes from VITE_API_URL so the same build points at
 * localhost in development and at the Render service in production.
 *
 * Render's free tier sleeps after 15 minutes: the first request after a nap can
 * take ~30s to wake the instance. `wakeBackend()` fires a cheap /health call so
 * the UI can show "waking up" instead of appearing frozen.
 */
import { IS_DEMO, demoApi, demoStreamAnswer } from "./demo";
import type {
  AnswerResponse,
  AskOptions,
  AuthToken,
  Chat,
  ChatDocumentsStatus,
  ChatMessage,
  DocumentBrief,
  DocumentPage,
  DocumentRecord,
  MemorySnapshot,
  StreamEvent,
  UploadResult,
  User,
} from "./types";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const TOKEN_KEY = "zambot.token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the failure is worth a "try again" rather than a red banner. */
  get isTransient() {
    return this.status === 0 || this.status === 503 || this.status >= 500;
  }
}

// ----------------------------------------------------------------- token
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode - the session simply will not persist */
  }
}

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

// ------------------------------------------------------------- transport
async function parseError(response: Response): Promise<never> {
  let detail: unknown;
  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    detail = body?.detail ?? body;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail[0]?.msg) {
      // FastAPI validation errors
      message = detail.map((d: { msg: string }) => d.msg).join(", ");
    }
  } catch {
    /* not JSON */
  }
  throw new ApiError(message, response.status, detail);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: authHeaders({
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(init.headers || {}),
      }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. It may be waking up - try again in a moment.",
      0,
    );
  }

  if (response.status === 401) {
    setToken(null);
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ------------------------------------------------------------------ auth
const realApi = {
  signup: (email: string, password: string, displayName?: string) =>
    request<AuthToken>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        display_name: displayName || null,
      }),
    }),

  login: (email: string, password: string) =>
    request<AuthToken>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),

  // ----------------------------------------------------------------- chats
  listChats: () => request<Chat[]>("/chats"),

  createChat: (title?: string) =>
    request<Chat>("/chats", {
      method: "POST",
      body: JSON.stringify({ title: title ?? null }),
    }),

  getChat: (chatId: string) => request<Chat>(`/chats/${chatId}`),

  renameChat: (chatId: string, title: string) =>
    request<Chat>(`/chats/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  deleteChat: (chatId: string) =>
    request<{ deleted: boolean }>(`/chats/${chatId}`, { method: "DELETE" }),

  listMessages: (chatId: string) =>
    request<ChatMessage[]>(`/chats/${chatId}/messages`),

  clearMessages: (chatId: string) =>
    request<{ deleted: boolean }>(`/chats/${chatId}/messages`, {
      method: "DELETE",
    }),

  // ------------------------------------------------------------- documents
  uploadDocuments: (chatId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<UploadResult>(`/chats/${chatId}/documents`, {
      method: "POST",
      body: form,
    });
  },

  listDocuments: (chatId: string) =>
    request<DocumentRecord[]>(`/chats/${chatId}/documents`),

  documentsStatus: (chatId: string) =>
    request<ChatDocumentsStatus>(`/chats/${chatId}/documents/status`),

  deleteDocument: (documentId: string) =>
    request<{ deleted: boolean; chat_status: string }>(
      `/documents/${documentId}`,
      { method: "DELETE" },
    ),

  downloadUrl: (documentId: string) =>
    request<{ url: string | null; expires_in: number }>(
      `/documents/${documentId}/download`,
    ),

  retryDocument: (documentId: string) =>
    request<{ queued: boolean; detail: string }>(
      `/ingestion/documents/${documentId}/retry`,
      { method: "POST" },
    ),

  // ------------------------------------------------------------------ chat
  ask: (chatId: string, message: string) =>
    request<AnswerResponse>(`/chat/${chatId}/message`, {
      method: "POST",
      body: JSON.stringify({ message, verify: true }),
    }),

  suggestions: (chatId: string) =>
    request<string[]>(`/chat/${chatId}/suggestions`),

  // Not on the backend yet: summary + key facts, generated once per document
  // at ingestion time and cached (one free-tier LLM call per upload).
  brief: (chatId: string) => request<DocumentBrief>(`/chat/${chatId}/brief`),

  // Not on the backend yet: the stored chunks for one page, so the viewer can
  // show and highlight the cited passage without shipping the whole file.
  documentPage: (documentId: string, page: number) =>
    request<DocumentPage>(`/documents/${documentId}/pages/${page}`),

  memory: (chatId: string) => request<MemorySnapshot>(`/memory/${chatId}`),

  health: () => request<{ status: string }>("/health"),
};

// -------------------------------------------------------------- streaming
/**
 * POST /chat/{id}/stream and yield decoded SSE events.
 *
 * EventSource cannot POST or send an Authorization header, so this parses the
 * SSE frames off a fetch body stream instead.
 */
async function* realStreamAnswer(
  chatId: string,
  message: string,
  signal?: AbortSignal,
  options: AskOptions = {},
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_URL}/chat/${chatId}/stream`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      verify: true,
      document_ids: options.documentIds ?? null,
      regenerate: options.regenerate ?? false,
    }),
    signal,
  });

  if (response.status === 401) {
    setToken(null);
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  if (!response.ok) await parseError(response);
  if (!response.body) throw new ApiError("The server sent no response body", 0);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const event = parseFrame(frame);
        if (event) yield event;
        split = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): StreamEvent | null {
  let name = "message";
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;

  try {
    const payload = JSON.parse(dataLines.join("\n"));
    return { type: name, ...payload } as StreamEvent;
  } catch {
    return null;
  }
}

/** Nudge a sleeping Render instance awake; resolves either way. */
export async function wakeBackend(): Promise<boolean> {
  if (IS_DEMO) return true;
  try {
    await fetch(`${API_URL}/health`, { cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------- export
/**
 * The rest of the app imports `api` and `streamAnswer` and never needs to know
 * which backend is behind them. Demo mode is on whenever VITE_API_URL is
 * unset, so the UI is fully explorable with nothing else running.
 */
export const api: typeof realApi = IS_DEMO
  ? (demoApi as unknown as typeof realApi)
  : realApi;

export const streamAnswer: typeof realStreamAnswer = IS_DEMO
  ? (demoStreamAnswer as unknown as typeof realStreamAnswer)
  : realStreamAnswer;

export { IS_DEMO } from "./demo";
export { resetDemo } from "./demo";
