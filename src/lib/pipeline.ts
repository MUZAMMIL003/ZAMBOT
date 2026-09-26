/**
 * The data side of "how it was read" and "how it was answered": the six
 * reading phases, the answer steps, and how to describe them in plain words.
 * Components live in ReadingPipeline.tsx and AnswerSteps.tsx.
 */
import type { PixelMode } from "@/components/ui/PixelMark";
import type { DocumentRecord, LiveStep, Phase, PhaseKey, PhaseStatus, TraceStep } from "@/lib/types";

export const PHASES: { key: PhaseKey; title: string; doing: string; blurb: string; mode: PixelMode; weight: number }[] = [
  {
    key: "upload",
    title: "Upload",
    doing: "Uploading",
    blurb: "The file is stored privately, so the original can be opened again later.",
    mode: "index",
    weight: 5,
  },
  {
    key: "inspect",
    title: "Inspect",
    doing: "Inspecting",
    blurb: "A throwaway sandbox opens the file and measures it: pages, text, tables, scanned pages.",
    mode: "inspect",
    weight: 15,
  },
  {
    key: "extract",
    title: "Extract",
    doing: "Extracting",
    blurb: "A script written for this exact file pulls out the text, headings and tables. It only counts if it passes the quality checks.",
    mode: "extract",
    weight: 30,
  },
  {
    key: "chunk",
    title: "Split into passages",
    doing: "Splitting into passages",
    blurb: "The text is cut into passages small enough to quote, each labelled with the page or section it came from.",
    mode: "chunk",
    weight: 10,
  },
  {
    key: "embed",
    title: "Map the meaning",
    doing: "Mapping the meaning",
    blurb: "Each passage becomes 768 numbers that describe what it means, so a question finds it even when the words differ.",
    mode: "embed",
    weight: 30,
  },
  {
    key: "index",
    title: "File it away",
    doing: "Filing it away",
    blurb: "Passages are saved to the knowledge base, searchable by meaning and by exact words.",
    mode: "index",
    weight: 10,
  },
];

export const PROCESSING = ["uploaded", "extracting", "analyzing"];
export const FAILED = ["failed", "manual_review"];

// ------------------------------------------------------------------ data
export const phase = (key: PhaseKey, status: PhaseStatus, facts: Record<string, unknown> = {}, detail: string | null = null): Phase => ({
  key,
  status,
  detail,
  facts,
  started_at: null,
  ended_at: null,
});

/** Where the document is right now, from `status_label`, for backends that send no phases. */
function activeFromLabel(document: DocumentRecord): PhaseKey {
  const label = (document.status_label ?? "").toLowerCase();
  if (document.status === "uploaded") return "upload";
  if (label.includes("inspect")) return "inspect";
  if (document.status === "extracting") return "extract";
  if (label.includes("split")) return "chunk";
  if (label.includes("embedding")) return "embed";
  if (label.includes("saving")) return "index";
  return "chunk";
}

/** The six phases of a document, straight from the backend or rebuilt from its status. */
export function phasesOf(document: DocumentRecord): Phase[] {
  const live = document.live?.phases;
  if (live && live.length === PHASES.length) return live;

  const failed = FAILED.includes(document.status);
  const ready = document.status === "ready";
  const current = ready ? null : failed ? null : activeFromLabel(document);
  const currentIndex = current ? PHASES.findIndex((p) => p.key === current) : PHASES.length;
  const facts: Record<PhaseKey, Record<string, unknown>> = {
    upload: { size_bytes: document.size_bytes },
    inspect: { file_type: document.extension },
    extract: { method: document.extraction_method, pages: document.page_count, characters: document.char_count },
    chunk: { chunks: document.chunk_count },
    embed: {},
    index: { rows: document.chunk_count },
  };
  return PHASES.map((p, index) => {
    if (failed) return phase(p.key, index === 0 ? "done" : "pending", facts[p.key]);
    if (index < currentIndex) return phase(p.key, "done", facts[p.key]);
    if (index === currentIndex) return phase(p.key, "active", facts[p.key], document.status_detail);
    return phase(p.key, "pending");
  });
}

export function stepsFor(key: PhaseKey, steps: LiveStep[]): LiveStep[] {
  return steps.filter((step) => {
    const home = step.phase ?? (step.kind === "probe" ? "inspect" : "extract");
    return home === key;
  });
}

export function fraction(p: Phase): number {
  if (p.status === "done" || p.status === "skipped") return 1;
  if (p.status !== "active") return 0;
  const done = Number(p.facts.done ?? 0);
  const planned = Number(p.facts.planned ?? 0);
  return planned > 0 ? Math.min(0.95, 0.1 + (0.85 * done) / planned) : 0.45;
}

export function percentOf(phases: Phase[]): number {
  const total = PHASES.reduce((sum, p) => sum + p.weight, 0);
  const done = PHASES.reduce((sum, meta, index) => sum + meta.weight * fraction(phases[index] ?? phase(meta.key, "pending")), 0);
  return Math.round((100 * done) / total);
}

export function activePhase(phases: Phase[]): Phase | undefined {
  return phases.find((p) => p.status === "active") ?? phases.find((p) => p.status === "failed");
}

export function modeOf(phases: Phase[]): PixelMode {
  const current = activePhase(phases);
  if (!current) return phases.every((p) => p.status === "done" || p.status === "skipped") ? "done" : "idle";
  if (current.status === "failed") return "error";
  return PHASES.find((p) => p.key === current.key)?.mode ?? "think";
}

// ---------------------------------------------------------------- format
export function duration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "";
  if (ms < 1000) return `${Math.max(0.1, ms / 1000).toFixed(1)}s`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(Math.round(seconds % 60)).padStart(2, "0")}s`;
}

export const number = (value: unknown) => (typeof value === "number" ? value.toLocaleString() : String(value ?? ""));
export const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

export const METHOD: Record<string, string> = {
  recipe: "Saved recipe",
  generated: "Custom script",
  basic: "Basic reader",
};

/** One line for the brief: "Read in 38s · 759 passages". */
export function readSummary(document: DocumentRecord): string {
  const phases = phasesOf(document);
  const started = phases.find((p) => p.started_at)?.started_at;
  const ended = [...phases].reverse().find((p) => p.ended_at)?.ended_at;
  const took = started && ended ? `Read in ${duration(ended - started)} · ` : "";
  return `${took}${plural(document.chunk_count, "passage")}`;
}

// ---------------------------------------------------------- answer steps
export const STEPS: Record<string, { done: string; doing: string; mode: PixelMode }> = {
  remembering: { done: "Recalled the conversation", doing: "Recalling the conversation", mode: "think" },
  rewriting: { done: "Understood the question", doing: "Working out what you mean", mode: "think" },
  sandbox: { done: "Calculated from the spreadsheet", doing: "Calculating from the spreadsheet", mode: "extract" },
  retrieving: { done: "Searched your documents", doing: "Searching your documents", mode: "inspect" },
  ranking: { done: "Picked the strongest passages", doing: "Picking the strongest passages", mode: "chunk" },
  generating: { done: "Wrote the answer", doing: "Writing the answer", mode: "extract" },
  verifying: { done: "Checked it against the source", doing: "Checking it against the source", mode: "inspect" },
};

/** One human sentence for what a step found. */
export function describe(step: TraceStep): string {
  const f = step.facts ?? {};
  const n = (key: string) => Number(f[key] ?? 0);
  switch (step.stage) {
    case "remembering":
      return n("recent_messages") > 0
        ? `Looked back over the last ${plural(n("recent_messages"), "message")}${f.has_summary ? " and the running summary" : ""}`
        : "A fresh conversation - nothing to recall";
    case "rewriting":
      return f.changed && f.question ? `Read it as “${String(f.question)}”` : "The question was already clear on its own";
    case "sandbox":
      return f.succeeded
        ? f.summary
          ? String(f.summary)
          : "Ran the numbers on every row"
        : `The calculation did not work after ${plural(n("runs"), "try")} - used the text instead`;
    case "retrieving": {
      if (!("candidates" in f)) return "";
      const parts = [];
      if (n("by_meaning")) parts.push(`${n("by_meaning")} by meaning`);
      if (n("by_keyword")) parts.push(`${n("by_keyword")} by exact words`);
      return `${plural(n("candidates"), "passage")} matched in ${plural(n("documents"), "document")}${
        parts.length ? ` (${parts.join(", ")})` : ""
      }`;
    }
    case "ranking":
      if (!("kept" in f)) return "";
      return n("kept") ? `Kept the ${n("kept")} most relevant of ${n("of")}` : `None of the ${n("of")} passages actually answer it`;
    case "generating":
      if (f.found === false) return "Nothing in your documents covers this";
      if (!("passages" in f)) return "";
      return `Wrote from ${plural(n("passages"), "passage")}${n("citations") ? ` with ${plural(n("citations"), "citation")}` : ""}`;
    case "verifying":
      if (f.verified === true) return `Every claim matched ${plural(n("checked"), "cited passage")}`;
      if (f.verified === false) return "Some claims could not be matched to the source";
      return "Check skipped";
    default:
      return "";
  }
}

export const titleOf = (stage: string, done: boolean) => STEPS[stage]?.[done ? "done" : "doing"] ?? stage;
