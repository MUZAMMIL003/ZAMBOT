/**
 * A small, forgiving markdown reader for answers.
 *
 * LLM answers mix headings, bullets, tables and prose in the same paragraph,
 * use `*` or `-` or `•` for bullets, and sometimes leave citations after a
 * table row. This parser works line by line, so every block type is found
 * wherever it sits, and it never throws on half-streamed text.
 */

export type ListItem = { text: string; depth: number; marker: string };

export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: ListItem[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "rule" };

const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+•●▪◦]|\d{1,3}[.)])\s+(.*)$/;
const FENCE = /^\s*```/;
const QUOTE = /^\s*>\s?(.*)$/;
const SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const CITATIONS_ONLY = /^(\s*\[\d+\]\s*)+$/;

const isBlank = (line: string) => !line.trim();
const isTableLine = (line: string) => line.includes("|") && !isBlank(line);

function startsTable(lines: string[], i: number): boolean {
  const line = lines[i];
  if (!isTableLine(line)) return false;
  const next = lines[i + 1] ?? "";
  if (SEPARATOR.test(next) && next.includes("|")) return true;
  // Pipe tables written without a separator line.
  return line.trim().startsWith("|") && next.trim().startsWith("|") && !SEPARATOR.test(line);
}

function startsBlock(lines: string[], i: number): boolean {
  const line = lines[i];
  return (
    HEADING.test(line) || RULE.test(line) || FENCE.test(line) || QUOTE.test(line) || LIST_ITEM.test(line) || startsTable(lines, i)
  );
}

export function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && body[i + 1] === "|") {
      current += "|";
      i++;
    } else if (ch === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Fit every row to the header: stray citation cells join the last real cell. */
function fitRow(row: string[], width: number): string[] {
  const cells = [...row];
  while (cells.length > width && (isBlank(cells[cells.length - 1]) || CITATIONS_ONLY.test(cells[cells.length - 1]))) {
    const extra = cells.pop()!.trim();
    if (extra) cells[cells.length - 1] = `${cells[cells.length - 1]} ${extra}`.trim();
  }
  while (cells.length < width) cells.push("");
  return cells;
}

function readTable(lines: string[], start: number): { block: Block; next: number } {
  const raw: string[] = [];
  let i = start;
  while (i < lines.length && isTableLine(lines[i]) && !HEADING.test(lines[i])) {
    raw.push(lines[i]);
    i++;
  }
  const rows = raw.filter((line) => !SEPARATOR.test(line)).map(splitRow);
  const [header = [], ...body] = rows;
  const width = Math.max(header.length, ...body.map((row) => fitRow(row, header.length).length));
  return {
    block: { kind: "table", header: fitRow(header, width), rows: body.map((row) => fitRow(row, width)) },
    next: i,
  };
}

function readList(lines: string[], start: number): { block: Block; next: number } {
  const items: ListItem[] = [];
  const first = lines[start].match(LIST_ITEM)!;
  const ordered = /\d/.test(first[2]);
  const baseIndent = first[1].replace(/\t/g, "    ").length;
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(LIST_ITEM);
    if (match) {
      const indent = match[1].replace(/\t/g, "    ").length;
      const depth = Math.max(0, Math.min(3, Math.round((indent - baseIndent) / 2)));
      // A new top-level list of the other kind ends this one.
      if (depth === 0 && /\d/.test(match[2]) !== ordered && items.length) break;
      items.push({ text: match[3], depth, marker: match[2] });
      i++;
      continue;
    }
    if (isBlank(line)) {
      // A blank line only continues the list when another item follows.
      const after = lines[i + 1];
      if (after !== undefined && LIST_ITEM.test(after)) {
        i++;
        continue;
      }
      break;
    }
    // An indented or lazy continuation line belongs to the previous item.
    if (items.length && !startsBlock(lines, i)) {
      items[items.length - 1].text += `\n${line.trim()}`;
      i++;
      continue;
    }
    break;
  }
  return { block: { kind: "list", ordered, items }, next: i };
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    if (FENCE.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence (or end of a half-streamed block)
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (startsTable(lines, i)) {
      const { block, next } = readTable(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const { block, next } = readList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(lines[i++].match(QUOTE)![1]);
      blocks.push({ kind: "quote", text: body.join("\n") });
      continue;
    }

    // A citation line straight after a table belongs to that table's last row.
    const previous = blocks[blocks.length - 1];
    if (previous?.kind === "table" && CITATIONS_ONLY.test(line) && previous.rows.length) {
      const last = previous.rows[previous.rows.length - 1];
      last[last.length - 1] = `${last[last.length - 1]} ${line.trim()}`.trim();
      i++;
      continue;
    }

    const body: string[] = [];
    while (i < lines.length && !isBlank(lines[i]) && (body.length === 0 || !startsBlock(lines, i))) {
      body.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: body.join("\n") });
  }
  return blocks;
}

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "citation"; number: number }
  | { kind: "strong" | "em" | "strike"; children: InlineToken[] }
  | { kind: "code"; text: string };

const INLINE =
  /(\\[\\`*_{}[\]()#+\-.!|~>])|(\[\d+\])|(\*\*\*([^*\n]+?)\*\*\*)|(\*\*(.+?)\*\*)|(__([^_\n]+?)__)|(`([^`\n]+)`)|(~~([^~\n]+?)~~)|((?<![\w*\\])\*(?![\s*])([^*\n]+?)(?<![\s\\])\*(?![\w*]))|((?<![\w_\\])_(?![\s_])([^_\n]+?)(?<![\s\\])_(?![\w_]))/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  const pushText = (value: string) => {
    const previous = tokens[tokens.length - 1];
    if (previous?.kind === "text") previous.text += value;
    else tokens.push({ kind: "text", text: value });
  };
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) pushText(text.slice(last, index));
    if (match[1]) pushText(match[1].slice(1)); // an escaped character, shown as itself
    else if (match[2]) tokens.push({ kind: "citation", number: Number(match[2].slice(1, -1)) });
    else if (match[3]) tokens.push({ kind: "strong", children: [{ kind: "em", children: parseInline(match[4]) }] });
    else if (match[5]) tokens.push({ kind: "strong", children: parseInline(match[6]) });
    else if (match[7]) tokens.push({ kind: "strong", children: parseInline(match[8]) });
    else if (match[9]) tokens.push({ kind: "code", text: match[10] });
    else if (match[11]) tokens.push({ kind: "strike", children: parseInline(match[12]) });
    else if (match[13]) tokens.push({ kind: "em", children: parseInline(match[14]) });
    else if (match[15]) tokens.push({ kind: "em", children: parseInline(match[16]) });
    last = index + match[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return tokens;
}

/** Answer text without markdown or citation markers - for copying. */
export function toPlainText(source: string): string {
  return source
    .replace(/\s?\[\d+\]/g, "")
    .replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, "$1")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__([^_\n]+?)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$\n?/gm, "");
}

/** A table cell as plain text, for CSV and clipboard. */
export const cellText = (cell: string) => toPlainText(cell).trim();
