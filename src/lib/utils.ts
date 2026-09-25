import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { IS_DEMO } from "./demo";

/** Tailwind-aware class joiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

/** "just now" / "12m ago" / "3d ago" / a date for anything older. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** What the upload pickers accept: the real backend reads PDF, Word and Excel. */
export const ACCEPTED_EXTENSIONS = IS_DEMO
  ? ["pdf", "docx", "txt", "md", "csv", "tsv", "xlsx", "xls", "pptx", "json", "html", "htm"]
  : ["pdf", "docx", "xlsx"];

export const ACCEPTED_LABEL = IS_DEMO
  ? "PDF, Word, Excel, PowerPoint, CSV, text and HTML"
  : "PDF, Word (.docx) and Excel (.xlsx)";

const FILE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  doc: "DOC",
  xlsx: "XLS",
  xls: "XLS",
  csv: "CSV",
  tsv: "TSV",
  pptx: "PPT",
  txt: "TXT",
  md: "MD",
  json: "JSON",
  html: "HTML",
  htm: "HTML",
};

export function fileLabel(extension: string): string {
  return FILE_ICONS[extension?.toLowerCase()] ?? extension?.toUpperCase() ?? "FILE";
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}\u2026`;
}

/** Wait, but cancellable via AbortSignal. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
