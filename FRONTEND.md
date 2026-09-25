# Zambot Frontend — Reference Guide

> Snapshot as of **2026-09-24**, after the "document intelligence" redesign.
> Now connected end to end to the FastAPI backend in `../backend` (real mode),
> with the in-browser demo backend still available. Read this first, then
> check the code: files may have moved on since.

---

## 1. What this is

Zambot is a document-chat app. You upload documents and ask questions, and
every answer quotes the passage and page it came from. This folder is the web
client.

- **Two modes.** Real mode talks to the FastAPI backend in `../backend`
  (Supabase, Gemini/Groq, E2B). Demo mode runs everything in the browser
  (`src/lib/demo.ts`) and needs no server.
- **Everything must stay on free tiers** (see §10 for how each feature maps
  to a free service).
- **The visual design is the owner's**: a light pastel "ChatEase" look with
  frosted white glass, black as the only accent, Helvetica and a pixel
  wordmark. The layout and flow follow ChatGPT / Claude (sidebar, composer
  first) plus NotebookLM / ChatPDF (a document panel with highlighted
  citations).
- **No login.** Pressing *Launch Zambot* opens a session silently. In real
  mode the app sends one shared access key (`VITE_ACCESS_KEY`) as the
  `X-Access-Key` header on every request; it must match `APP_ACCESS_KEY` in
  `backend/.env`. The key ships inside the built bundle, so it is a light
  gate, not real security.

---

## 2. Run it

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server on **127.0.0.1:3000** |
| `npm run build` | `tsc --noEmit` then `vite build` → `dist/` |
| `npm run preview` | Serves `dist/` on **127.0.0.1:4173** |
| `npm run typecheck` / `npm run lint` | Both clean |
| `npm run shots` | Viewport screenshots via local Chrome (needs `preview`) |

Demo mode turns on automatically when `VITE_API_URL` is unset. To use the real
backend, create `.env.local` (gitignored; see `.env.local.example`):

| Variable | Value |
|---|---|
| `VITE_API_URL` | `http://127.0.0.1:8000` (the backend) |
| `VITE_DEMO_MODE` | `false` |
| `VITE_ACCESS_KEY` | The same value as `APP_ACCESS_KEY` in `backend/.env` |

The backend must list the frontend's address in `FRONTEND_ORIGIN` (CORS).
The host is pinned to `127.0.0.1` because Windows can resolve `localhost` to
`::1`. Restart Vite after changing `.env.local`.

**Real-mode differences:** uploads accept only PDF, Word (.docx) and Excel
(.xlsx); documents are read in an E2B sandbox and the live code is shown
under *Watch the sandbox* (and kept in Sources as *Show sandbox*); a question
sent with files is queued and answered once reading finishes; a 401 clears the
session and shows a "key rejected" message.

---

## 3. Stack

Vite 6 · React 18 · TypeScript (strict) · react-router-dom 6 · Tailwind 3.4 ·
framer-motion 11 · lucide-react (icons) · puppeteer-core (screenshots only). Path alias: `@/` → `src/`.
The project moved from Next.js because Next's `.next/` folder broke inside
OneDrive (`EINVAL readlink`).

---

## 4. Layout

```
 ≥1280 (xl)   ┌ Sidebar 272 ┬──────── page ────────┬ DocumentPanel 460 (docked, when open) ┐
 1024–1279    ┌ Sidebar 272 ┬──────── page ────────┐  DocumentPanel slides over from right
 <1024        ┌──────────── page ─────────────┐   ☰ opens Sidebar as a left drawer;
                                                  DocumentPanel is a bottom sheet (88dvh)
```

- **Sidebar** (`components/chat/Sidebar.tsx`) is the only navigation. It holds
  the logo, a glass *New chat* button, **search** (matches chat titles *and*
  document names), every chat (title, file count, relative time, two-tap
  delete), then *Your files* and *Settings*. Below lg every page header starts
  with the ☰ `MenuButton`. There is no tab bar.
- **DocumentPanel** (`components/chat/DocumentPanel.tsx`) belongs to the
  conversation screen. It has two tabs:
  - **Document**: one page, with a heading, the quoted passages drawn in, the
    cited passage highlighted (yellow with a gold edge) and scrolled into
    view, page ‹ › controls, a document switcher and *Open original*.
  - **Sources**: every document with a status, an on/off **switch for "use in
    answers"** and a progress bar while reading, plus Remove (two taps), Retry
    and *Add documents*.

---

## 5. Routes and flow

| Path | Screen |
|---|---|
| `/` | `Landing`: the pixel wordmark types itself out, then *Launch Zambot* |
| `/chats`, `/chats/new` | `Start`: the composer-first start screen (replaces the old Home + New Chat) |
| `/chats/:chatId` | `Conversation` |
| `/chats/files` | `Files`: every document; tapping one opens it in its chat's panel (`state.openDocument`) |
| `/chats/settings` | `Settings`: Files, *Delete all chats*, *Reset demo data*, account, **Log out** |

```
Landing ─Launch─▶ Start ("What are we reading today?")
                   │  big composer: attach / paste / drop files anywhere → chips,
                   │  type a question, send both together
                   │  "Or try a sample" (seeded chats) · "Continue" (phones only)
                   ▼ createChat(title from file name or first 6 words)
                   navigate(/chats/:id, state { initialMessage, initialFiles })
Conversation
  ├─ files upload at once; BriefCard shows "Reading N documents…" with bars
  ├─ a question sent while reading is QUEUED: it shows in the thread with
  │   "I will answer as soon as reading finishes" and is asked automatically
  ├─ reading done → BriefCard = summary + key facts (each opens its page)
  │   + "Start with" questions; it folds to one line once the chat has messages
  ├─ answer streams: stages → tokens → sources → done
  │   · citation pills: hover (mouse) or tap (touch) → pop-up with the quoted
  │     passage + "Open page N in document"
  │   · source cards (2 columns) with a snippet preview → open the panel
  │   · "Calculated from the document: (48.3 − 46.8) ÷ 46.8 = 3.2%", with the
  │     script behind "How" (only for answers that did arithmetic)
  │   · tables render as tables with Copy table / Download CSV
  │   · footer: Verified badge · Copy · Regenerate (last answer) · Show in document
  │   · "Related" follow-ups under the last answer
  │   · not in the documents → "not covered" + "Closest passage I found"
  └─ header: ☰ (phones) · title/subtitle ("2 documents · 1 in use") ·
     Sources · Share (copies the link / native share sheet) · ⋯ (Clear messages, Delete chat)
```

**Composer** (`components/chat/Composer.tsx`, `forwardRef` with the handle
`addFiles` / `focus`):

- Staged file chips show a file-type icon, name, size and ×.
- Unsupported types are skipped with a notice. The limit is 10 files.
- Paste works, and drag-and-drop works through `FileDropZone`.
- Mic dictation uses the Web Speech API; the mic is hidden where the browser
  lacks it.
- Typing is off only when a chat has no documents at all. While reading, you
  can type ("Ask while it reads…").
- Variants: `hero` (start screen) and `dock` (conversation).

---

## 6. Design system (as implemented)

**Tokens** (`src/index.css :root`):

| Token | Value |
|---|---|
| `--bg` | `246 247 250` |
| `--surface` | white |
| `--row` | `242 244 247` |
| `--border` | `0 0 0 / .06` |
| `--text` | black |
| `--text-muted` | `99 106 118` |
| `--accent` | **black** |
| `--accent-bright` | `64 64 64` |

The font is Helvetica Neue. `.mesh-bg` is the pastel ground: lavender
`#D4CDE6`, blush `#F1E5E7`, mint `#CDE6E2` and blue `#E3E9F3` on `#E6E1EE`.

**Recipes** (no solid-black blocks and no dark glows; the owner found them too flashy):

| Element | Style |
|---|---|
| Glass cards | `bg-white/40–60` + `backdrop-blur` + `border-white/50–60` + `rounded-[24px]` |
| New chat | a glass row: `rounded-xl border-black/[0.06] bg-white/75`, pen-square icon, left-aligned |
| Send | 40px circle; active is charcoal `#2B2B30` with an up arrow, disabled is `bg-black/[0.07]` with a faint arrow |
| Active / selected | white + `ring-1 ring-black/10–15` (Sources button, document switcher, paperclip hint) |
| Switch | 40×24 track (`#3A3A40` on / `black/14` off), 20px knob, `translate-x-4`; the track is `inline-flex p-0.5` so the knob can never escape it |
| Citation pills and number badges | `bg-black/[0.07]` grey, darker grey on hover or open |
| Pop-up button | `bg-black/[0.05]` soft pill |
| Progress bars | `text/55` charcoal |
| Highlight | `#FFF1A8` with an inset `#E8C547` edge; pop-up quotes use `#FFF8DC` |
| Menus and pop-ups | solid white `rounded-2xl shadow-lifted` (a blur nested inside a blur fails in Chrome) |
| Orb / Aurora | pastel, for the empty chat, reading state and Landing |

**Icons:** **Lucide** (`lucide-react`, ISC licence) through `components/ui/Icon.tsx`. Choose them by what the control does:

| Control | Icon |
|---|---|
| New chat | `newChat` (SquarePen) |
| Menu | `menu` |
| Send | `arrowUp` |
| Attach | `paperclip`, not rotated |
| Copy / Download | `copy` / `download` |
| Regenerate | `refresh` (RotateCcw) |
| Sources | `files` |
| Brief | `book` |
| Calculation | `calculator` |
| Closest passage | `findText` |
| Verified | `verified` (ShieldCheck) |
| Related | `cornerDownRight` |
| Open original | `externalLink` |
| Account | `user` |

Don't use sparkles. `FileTypeIcon` shows file types as a document glyph on a tinted tile: PDF red, Word blue, Excel/CSV green, PowerPoint orange, JSON/HTML violet. It replaces the old black "PDF" text badges.

Motion is framer-motion: fade and rise on enter, springs for the drawer and
sheet, and a `prefers-reduced-motion` guard.

---

## 7. Data layer

Pages import only `api` and `streamAnswer` from `src/lib/api.ts`. Each one
switches between `realApi` and `demoApi` based on `IS_DEMO`.

**Additions in this redesign:**

| Addition | Details |
|---|---|
| `Source.snippet` | The quoted passage behind a citation |
| `SandboxRun.summary` | Plain-language maths for a calculation |
| `ChatMessage.related` / `closest` | Follow-up questions; the nearest passage when "not covered" |
| `StreamEvent` | `sandbox_start.summary`, `done.related`, `done.closest` |
| `AskOptions { documentIds?, regenerate? }` | The fourth argument of `streamAnswer`; the real client sends `document_ids` / `regenerate` |
| `api.brief(chatId)` → `DocumentBrief { summary, key_facts[], questions[] }` | The UI falls back to `suggestions()` if it fails |
| `api.documentPage(docId, page)` → `DocumentPage { heading, blocks[{text or null}] }` | `null` blocks are drawn as grey text lines |

The real backend implements all of these: brief, document pages, snippets,
related/closest, `document_ids`, `regenerate` and sandbox events. §10 records
how each maps to a free service.

**Browser storage:**

| Key | Holds |
|---|---|
| `zambot.token` | Session token |
| `zambot.demo.v2` | Demo state (v1 is ignored) |
| `zambot.excluded.<chatId>` | Documents switched off in Sources |

---

## 8. Demo backend (`src/lib/demo.ts`)

**Seeded chats:**

| Chat | Documents | State |
|---|---|---|
| **Acme Q3 2025 Report** (`demo-chat-financials`) | `Acme_Q3_2025_Report.pdf`, 24 p | 2 turns |
| **Vendor Services Agreement** (`demo-chat-agreement`) | `Vendor_Agreement_v3.docx`, 38 p · `Schedule_B_Pricing.xlsx`, 3 p | 2 turns |
| **Onboarding Handbook** (`demo-chat-handbook`) | `Onboarding_Handbook.pdf`, 32 p | Fresh; shows the full brief |
| **Untitled chat** (`demo-chat-empty`) | none | Pending |

Each seeded chat has:

- **KNOWLEDGE**: keyword → answer, each citing sources that carry quoted
  passages (`P.*`).
- **HEADINGS**: section titles per page.
- **BRIEFS**: a summary plus 5 key facts with pages.
- **SUGGESTIONS** and **RELATED_POOL**.

**Answers worth demoing:**

| Chat | Question | Shows |
|---|---|---|
| Acme | "How did it compare to forecast?" | Calculation (3.2%) |
| Acme | "What happened to gross margin?" | Calculation (16.6% EBITDA margin) |
| Acme | "Put the key figures in a table" | Table + CSV |
| Acme | "What did the board say about the EMEA region?" | Not covered + closest passage |
| Vendor | "What does Schedule B charge per year?" | Calculation (EUR 2,500 per seat) |
| Vendor | "Extract all fees into a table" | Table |
| Vendor | Schedule B switched off, then ask about price | Not covered (the source is ignored) |
| Any | "Summarise the report / agreement / handbook" | Multi-citation summary |

**User uploads:**

- `.txt .md .csv .tsv .json .html` are **read in the browser** and split into
  units.
- Questions are answered by keyword search over those units. A
  "Label: value" line becomes "the label is value", for example "According
  to Quarterly_Plan.txt, the revenue target is EUR 12M".
- The brief pulls key facts from "Label: value" lines.
- Summary questions list the first units.
- PDF and Office uploads get a generic grounded answer, with a pop-up that
  explains the demo can't read that format.

**Answer rules, in order:**

1. A keyword match in a seeded chat.
2. A user chat: search the uploaded text, fall back to the generic answer for
   binary files, otherwise "not covered".
3. No documents → `NO_DOCUMENT`.
4. All documents switched off → `ALL_EXCLUDED`.
5. Otherwise → `NOT_FOUND` plus the closest passage, if any passage shares a
   keyword.

Only grounded answers get the verify stage and `verified: true`. Related
follow-ups skip anything already asked, including rephrasings whose keywords
are all covered.

**Ingestion:** `uploaded → extracting ("Reading", 0s) → analyzing ("Indexing",
2.6s) → ready (5.2s)`, with files staggered 600 ms apart. A text file's page
count is `ceil(chars / 1800)`.

**Regenerate** removes the last turn in the store before answering again, so
nothing is duplicated.

---

## 9. File map

```
src/
  main.tsx · App.tsx (routes) · index.css (tokens + component classes)
  lib/     api.ts · demo.ts · types.ts · providers.tsx (auth, legacy theme) ·
           chats-context.tsx (chats, deleteChat, deleteAllChats, openSidebar) · utils.ts ·
           markdown.ts (line-based answer parser: headings, `-`/`*`/`•`/numbered lists, pipe
           tables with or without a separator, quotes, code; stray citation cells join the row)
  routes/  Landing · AppShell (Sidebar + page) · Start · Conversation · Files · Settings
  components/chat/
           Sidebar · Composer · FileDropZone · BriefCard · Message (RichText, tables,
           CitationPill + SourcePopover, SourceCards, ClosestPassage, RelatedQuestions,
           AnswerFooter, Thinking) · SandboxBlock · DocumentPanel (spreadsheet sheets render as a
           table: sticky header, row numbers, row filter, 200 rows at a time, quoted row highlighted)
           SideRail (DEAD, older)
  components/ui/
           Icon · AnimatedLogo · PageHeader (+ MenuButton) · List · Skeleton · Orb · Aurora
           PromoCard, Button, ThemeToggle, Logo (DEAD, older)
  components/upload/ Dropzone, FileStatus (DEAD, older)
_superseded/   Home, NewChat, NavigationRail, HistoryRail, TabBar - replaced in this
               redesign, kept out of the build (see _superseded/README.md)
```

---

## 10. How each feature is served by the backend (all free, all built)

| Feature | What the backend must add | Free way to do it |
|---|---|---|
| Quoted passages | Return each chunk's text as `snippet` on every source | Already stored in Postgres/pgvector (Supabase free tier) |
| Page viewer + highlight | `GET /documents/:id/pages/:n` returning the chunks on a page | The same chunk table (page is already stored); later render originals with **PDF.js** (Apache-2.0) from Supabase Storage |
| Brief | `GET /chat/:id/brief`, generated once when a document finishes ingesting and cached in a table | One call per document to Groq or OpenRouter free models |
| Related questions | `done.related` | Produce them in the same LLM call as the answer: no extra request |
| Closest passage | `done.closest` = the top retrieval hit when below the grounding threshold | Already computed during retrieval |
| Use/skip sources | Accept `document_ids` in `/chat/:id/stream` and filter retrieval | A SQL `WHERE document_id = ANY(...)` |
| Regenerate | Accept `regenerate: true` and replace the last assistant turn | Plain DB update |
| Calculations | Emit `sandbox_start {code, summary}` / `sandbox_result` only when arithmetic is needed | E2B free tier, or Python's `ast`-restricted `eval` for simple maths |
| Tables and CSV | Nothing: the LLM writes a markdown table, and the browser renders it and builds the CSV | Free |
| Dictation | Nothing: the browser's Web Speech API | Free |
| Search | Client-side filter now; Postgres full-text search later | Free |

---

## 11. Checking your work

- `npm run typecheck && npm run lint && npm run build`
- Flows to click after any change:
  1. Start → attach a `.txt` with "Label: value" lines, type a question, send
     → the question is queued → answered from the file, and the brief shows
     key facts.
  2. Acme → *Document brief* → a key fact → the panel opens on the page with
     the passage highlighted.
  3. Hover a citation → pop-up → *Open page N in document*.
  4. Acme: "Put the key figures in a table" → Download CSV.
  5. Acme: an off-topic question → not covered + closest passage.
  6. Regenerate, then reload → no duplicate turns.
  7. Vendor → Sources → switch off Schedule B → ask the price → not covered.
  8. Phone width: ☰ drawer; tap a citation → pop-up → bottom sheet.
  9. Resize 390 → 1100 → 1440: drawer / overlay panel / docked panel.
  10. Settings → Log out → Landing.

The last full run passed 31 automated checks at 390, 1100 and 1440 px, with
no console errors.
