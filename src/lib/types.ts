/** Mirrors the Pydantic response models in the backend. */

export type DocumentStatus =
  | "uploaded"
  | "extracting"
  | "analyzing"
  | "ready"
  | "failed"
  | "manual_review";

export type ChatStatus = "pending" | "processing" | "active" | "archived";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  auth_provider: string;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ChatDocumentPreview {
  id: string;
  filename: string;
  extension: string;
  status: DocumentStatus;
  page_count: number;
  chunk_count: number;
}

export interface Chat {
  id: string;
  title: string;
  status: ChatStatus;
  message_count: number;
  document_count: number;
  ready_document_count: number;
  last_message_at: string | null;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
  documents: ChatDocumentPreview[];
}

/** One step of the extraction sandbox, shown live while a document is read. */
export interface LiveStep {
  kind: "probe" | "extract" | "note";
  attempt: number;
  code: string;
  output: string;
  status: "running" | "success" | "failed";
  /** The reading phase this run belongs to. */
  phase?: PhaseKey | null;
  started_at?: number;
  ended_at?: number;
}

/** The six stages every document goes through, in order. */
export type PhaseKey = "upload" | "inspect" | "extract" | "chunk" | "embed" | "index";
export type PhaseStatus = "pending" | "active" | "done" | "failed" | "skipped";

export interface Phase {
  key: PhaseKey;
  status: PhaseStatus;
  detail: string | null;
  /** What the phase found or produced - counts, sizes, a sample passage. */
  facts: Record<string, unknown>;
  /** Epoch milliseconds. */
  started_at: number | null;
  ended_at: number | null;
}

export interface LiveState {
  stage: string;
  label: string | null;
  detail: string | null;
  steps: LiveStep[];
  phases?: Phase[];
}

/** One step the assistant took to answer, with how long it took. */
export interface TraceStep {
  stage: string;
  label?: string;
  ms: number;
  facts: Record<string, unknown>;
}

export interface DocumentRecord {
  id: string;
  chat_id: string;
  filename: string;
  extension: string;
  mime_type: string | null;
  size_bytes: number;
  status: DocumentStatus;
  status_label: string;
  status_detail: string | null;
  error: string | null;
  extraction_method: string | null;
  extraction_attempts: number;
  page_count: number;
  char_count: number;
  chunk_count: number;
  used_recipe?: boolean;
  used_fallback?: boolean;
  created_at: string;
  ready_at: string | null;
  live?: LiveState | null;
}

export interface UploadResult {
  chat_id: string;
  documents: DocumentRecord[];
  skipped: { filename: string; reason: string }[];
}

export interface ChatDocumentsStatus {
  chat_id: string;
  chat_status: ChatStatus;
  all_ready: boolean;
  any_processing: boolean;
  documents: DocumentRecord[];
}

export interface Source {
  chunk_id: string;
  document_id: string;
  filename: string;
  page: number | null;
  page_end?: number | null;
  label: string;
  score: number;
  matched_by: string[];
  citation?: number | null;
  /** The passage the answer leans on, shown in citation pop-ups. */
  snippet?: string | null;
}

export interface SandboxRun {
  code: string;
  output: string | null;
  status: "running" | "success" | "error";
  /** Plain-language version of the calculation, e.g. "1,250,000 / 500 = 2,500". */
  summary?: string | null;
}

export interface ChatMessage {
  id: string;
  seq: number;
  role: "user" | "assistant" | "system";
  content: string;
  rewritten_question: string | null;
  sources: Source[] | null;
  sandbox_runs?: SandboxRun[] | null;
  trace?: TraceStep[] | null;
  verified: boolean | null;
  /** Follow-up questions offered under the answer. */
  related?: string[] | null;
  /** Best passage found when the answer was "not covered". */
  closest?: Source | null;
  created_at: string;
}

export interface AnswerResponse {
  chat_id: string;
  message_id: string;
  seq: number;
  question: string;
  rewritten_question: string;
  answer: string;
  sources: Source[];
  sandbox_runs?: SandboxRun[];
  verified: boolean | null;
  verification_note: string | null;
  grounded: boolean;
  retrieval_counts: Record<string, number>;
  latency_ms: number;
  created_at: string;
}

/** Events emitted by POST /chat/{id}/stream. */
export type StreamEvent =
  | { type: "status"; stage: string; label?: string }
  | ({ type: "step" } & TraceStep)
  | { type: "rewritten"; question: string }
  | { type: "token"; text: string }
  | { type: "replace"; text: string }
  | { type: "sources"; sources: Source[] }
  | { type: "sandbox_start"; code: string; summary?: string | null }
  | { type: "sandbox_result"; output: string; status: "success" | "error"; summary?: string | null }
  | {
      type: "done";
      message_id: string;
      seq: number;
      verified: boolean | null;
      verification_note?: string | null;
      grounded: boolean;
      sources: Source[];
      sandbox_runs?: SandboxRun[];
      trace?: TraceStep[] | null;
      related?: string[];
      closest?: Source | null;
      latency_ms?: number;
    }
  | { type: "error"; detail: string };

export interface MemorySnapshot {
  chat_id: string;
  short_term: { role: string; content: string; seq: number }[];
  short_term_source: string;
  summary: string | null;
  summary_message_count: number;
  message_count: number;
  summary_due: boolean;
}

/** Options for a question. */
export interface AskOptions {
  /** Only answer from these documents. Omitted = every document in the chat. */
  documentIds?: string[];
  /** Replace the last answer instead of adding a new turn. */
  regenerate?: boolean;
}

export interface KeyFact {
  label: string;
  value: string;
  document_id: string;
  page: number | null;
}

/** What the user sees the moment a chat's documents finish reading. */
export interface DocumentBrief {
  chat_id: string;
  summary: string;
  key_facts: KeyFact[];
  questions: string[];
  /** True while the server is still writing it; ask again shortly. */
  pending?: boolean;
}

/**
 * One block of a document page, for the in-app viewer. Text blocks carry `text` (`null` is a
 * paragraph the preview does not carry - drawn as grey lines); tables carry
 * `header` and `rows` instead.
 */
export interface PageBlock {
  type?: "heading" | "paragraph" | "table";
  text?: string | null;
  level?: number;
  header?: string[];
  rows?: string[][];
}

export interface DocumentPage {
  document_id: string;
  filename: string;
  page: number;
  page_count: number;
  /** "Page 3", or "Sheet: Sales" for spreadsheets. */
  label?: string;
  heading: string | null;
  blocks: PageBlock[];
}
