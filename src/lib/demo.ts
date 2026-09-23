/**
 * Demo mode: a fake backend that runs entirely in the browser.
 *
 * Turned on automatically when VITE_API_URL is not set, so `npm run dev`
 * with no .env.local gives you a fully clickable app with no Python, no
 * Supabase and no API keys. Set VITE_API_URL to point at the real
 * backend and this switches itself off.
 *
 * It mimics the real API's shapes and timings: login accepts anything, uploads
 * walk through Extracting -> Analyzing -> Ready, and answers stream in token by
 * token with citations. State is kept in localStorage so a reload does not
 * throw away the conversation.
 *
 * Two kinds of chat:
 *  - Seeded chats answer from canned knowledge below (quoted passages, page
 *    headings, briefs, calculations, tables).
 *  - Chats the user creates answer from the files they upload. Text-like
 *    files (.txt .md .csv .json .html) are read in the browser and searched
 *    for real; other formats get a generic answer, since the demo cannot
 *    parse PDFs or Office files client-side.
 */
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
  DocumentStatus,
  KeyFact,
  MemorySnapshot,
  SandboxRun,
  Source,
  StreamEvent,
  UploadResult,
  User,
} from "./types";

export const IS_DEMO =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  (import.meta.env.VITE_DEMO_MODE !== "false" && !import.meta.env.VITE_API_URL);

export const DEMO_TOKEN = "demo-mode-token";
// Bumped whenever the seeded shape changes, so old saved demos do not linger.
const STORE_KEY = "zambot.demo.v2";

const DEMO_USER: User = {
  id: "demo-user-0001",
  email: "demo@zambot.app",
  display_name: "Demo User",
  auth_provider: "local",
  created_at: new Date(Date.now() - 86400_000 * 12).toISOString(),
};

// --------------------------------------------------------------------- utils
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const id = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

function notFound(what: string): Error {
  return Object.assign(new Error(`${what} not found`), { status: 404 });
}

// ------------------------------------------------------------ canned answers
interface Calculation {
  summary: string;
  code: string;
  output: string;
}

interface QA {
  match: string[];
  answer: string;
  sources: Source[];
  /** What the question-rewriter would turn a follow-up into. */
  standalone?: string;
  /** Present only when the answer needed arithmetic. */
  calc?: Calculation;
}

function source(
  documentId: string,
  filename: string,
  page: number,
  citation: number,
  score: number,
  snippet: string | null = null,
): Source {
  return {
    chunk_id: id("chunk"),
    document_id: documentId,
    filename,
    page,
    page_end: null,
    label: `Page ${page}`,
    score,
    matched_by: citation === 1 ? ["vector", "keyword"] : ["vector"],
    citation,
    snippet,
  };
}

// ------------------------------------------------------------------- seeding
const DOC_A = "demo-doc-acme";
const DOC_B1 = "demo-doc-agreement";
const DOC_B2 = "demo-doc-pricing";
const DOC_C = "demo-doc-handbook";

const ACME = "Acme_Q3_2025_Report.pdf";
const AGREEMENT = "Vendor_Agreement_v3.docx";
const PRICING = "Schedule_B_Pricing.xlsx";
const HANDBOOK = "Onboarding_Handbook.pdf";

const CHAT_A = "demo-chat-financials";
const CHAT_B = "demo-chat-agreement";
const CHAT_C = "demo-chat-handbook";
const CHAT_D = "demo-chat-empty";

// The passages each citation points at. Shared between answers, so the viewer
// shows one consistent page whichever answer opened it.
const P = {
  acmeRevenue:
    "Total revenue for the third quarter of 2025 was EUR 48.3 million, an increase of 12.4% compared with Q3 2024.",
  acmeMix:
    "Subscription revenue reached EUR 39.1 million. Professional services contributed EUR 9.2 million, reflecting three large implementation projects.",
  acmeGuidance:
    "Q3 revenue of EUR 48.3 million compares with guidance of EUR 46.8 million issued in July.",
  acmeEmea:
    "The outperformance was driven primarily by earlier-than-expected renewals across the EMEA enterprise segment.",
  acmeMargin:
    "Gross margin improved to 71.2% (Q3 2024: 68.9%). Adjusted EBITDA was EUR 8.0 million.",
  acmeOpex:
    "Operating expenses increased 8.1% to EUR 26.4 million, mainly reflecting additional R&D headcount.",
  acmeNrr:
    "Net revenue retention was 112%. Logo churn fell to 1.4%, the lowest level in six quarters.",
  acmeChurn:
    "Two enterprise customers with combined ARR of EUR 1.25 million did not renew during the quarter.",
  acmePeople:
    "Headcount at 30 September 2025: 412 FTE (30 June 2025: 381). R&D represents 44% of total headcount.",
  vTermination:
    "11.2 Either party may terminate this Agreement for convenience by giving not less than sixty (60) days' written notice. Termination for cause requires thirty (30) days' notice following an uncured breach.",
  vRefund:
    "11.4 Upon termination, Vendor shall refund, pro rata, any fees paid in advance for the period following the termination date.",
  vPricing:
    "Platform fee (up to 500 named seats): EUR 1,250,000 per annum. Additional seats: EUR 1,900 per seat per annum. Professional services: EUR 1,450 per day.",
  vIncrease:
    "7.3 Fees are fixed for the first twenty-four (24) months. Thereafter, annual increases shall not exceed CPI plus two percent (2%).",
  vLiability:
    "9.1 Each party's aggregate liability shall not exceed the fees paid in the twelve (12) months preceding the claim. The cap shall not apply to breach of confidentiality, indemnification obligations or wilful misconduct.",
  vConsequential:
    "9.3 Neither party shall be liable for any indirect, incidental or consequential damages.",
  vProcessor:
    "14.1 Vendor shall process Personal Data only on documented instructions from Customer, and shall give thirty (30) days' prior written notice of any new sub-processor.",
  vAnnex:
    "Annex 2 lists the approved sub-processors and the regions in which Customer data is hosted.",
  hLeave:
    "Full-time employees are entitled to 25 days' paid annual leave in addition to public holidays. Up to five (5) unused days may be carried over and must be taken by 31 March.",
  hExpenses:
    "Submit expense claims through the finance portal within 30 days. A receipt is required for any item over EUR 25.",
  hTravel:
    "Travel costing more than EUR 500 must be approved by your manager before booking.",
  hRemote:
    "We work hybrid: at least two days per week in an office. Teams agree their office days together. Fully remote arrangements require director approval.",
  hProbation:
    "Probation lasts six months, with a formal check-in after three months. Notice during probation is two weeks, and one month thereafter.",
};

const KNOWLEDGE: Record<string, QA[]> = {
  [CHAT_A]: [
    {
      match: ["revenue", "total", "quarter", "q3", "earn", "made", "sales"],
      answer:
        "Total revenue for Q3 2025 was EUR 48.3 million [1], up 12.4% year over year [1].\n\nSubscription revenue made up EUR 39.1 million of that, with professional services contributing the remaining EUR 9.2 million [2].",
      sources: [
        source(DOC_A, ACME, 4, 1, 0.91, P.acmeRevenue),
        source(DOC_A, ACME, 7, 2, 0.84, P.acmeMix),
      ],
    },
    {
      match: ["forecast", "guidance", "expect", "compare", "predicted", "beat"],
      standalone:
        "How does Q3 2025 total revenue of EUR 48.3 million compare to the forecast?",
      answer:
        "Revenue came in 3.2% above guidance: the forecast was EUR 46.8 million against EUR 48.3 million actual [1].\n\nManagement attributes the beat to earlier-than-expected renewals in the EMEA enterprise segment [2].",
      sources: [
        source(DOC_A, ACME, 9, 1, 0.89, P.acmeGuidance),
        source(DOC_A, ACME, 11, 2, 0.77, P.acmeEmea),
      ],
      calc: {
        summary: "(48.3 − 46.8) ÷ 46.8 = 3.2% above guidance",
        code: "actual = 48.3     # EUR m, page 9\nforecast = 46.8   # EUR m, page 9\n\nbeat = (actual - forecast) / forecast\nprint(f\"{beat:.1%}\")",
        output: "3.2%",
      },
    },
    {
      match: ["margin", "profit", "ebitda", "cost", "expense", "operating"],
      answer:
        "Gross margin was 71.2%, up from 68.9% in Q3 2024 [1]. Operating expenses rose 8.1% to EUR 26.4 million, driven mainly by headcount in R&D [2].\n\nThat left adjusted EBITDA of EUR 8.0 million, a 16.6% margin on revenue [1].",
      sources: [
        source(DOC_A, ACME, 12, 1, 0.88, P.acmeMargin),
        source(DOC_A, ACME, 13, 2, 0.8, P.acmeOpex),
      ],
      calc: {
        summary: "EUR 8.0m EBITDA ÷ EUR 48.3m revenue = 16.6% margin",
        code: "ebitda = 8.0     # EUR m, page 12\nrevenue = 48.3   # EUR m, page 4\n\nprint(f\"{ebitda / revenue:.1%}\")",
        output: "16.6%",
      },
    },
    {
      match: ["churn", "customer", "retention", "nrr", "renewal"],
      answer:
        "Net revenue retention was 112% for the quarter [1]. Logo churn was 1.4%, its lowest level in six quarters [1].\n\nThe report notes that two enterprise accounts representing EUR 1.25 million in ARR did not renew [2].",
      sources: [
        source(DOC_A, ACME, 16, 1, 0.9, P.acmeNrr),
        source(DOC_A, ACME, 17, 2, 0.75, P.acmeChurn),
      ],
    },
    {
      match: ["headcount", "employee", "hiring", "staff", "people", "team"],
      answer:
        "Headcount closed the quarter at 412 full-time employees, up from 381 at the end of Q2 [1]. R&D accounts for 44% of total headcount [1].",
      sources: [source(DOC_A, ACME, 19, 1, 0.83, P.acmePeople)],
    },
    {
      match: ["table", "key figures", "figures", "metrics", "kpi"],
      answer:
        "Here are the headline figures, each quoted from the page shown [1][2][3]:\n\n| Metric | Q3 2025 | Page |\n|---|---|---|\n| Total revenue | EUR 48.3m | 4 |\n| Growth vs Q3 2024 | +12.4% | 4 |\n| Gross margin | 71.2% | 12 |\n| Adjusted EBITDA | EUR 8.0m | 12 |\n| Net revenue retention | 112% | 16 |\n| Headcount | 412 FTE | 19 |",
      sources: [
        source(DOC_A, ACME, 4, 1, 0.86, P.acmeRevenue),
        source(DOC_A, ACME, 12, 2, 0.84, P.acmeMargin),
        source(DOC_A, ACME, 16, 3, 0.8, P.acmeNrr),
      ],
    },
    {
      match: ["summar", "overview", "key points", "main points", "tl;dr"],
      answer:
        "The report covers Acme's third quarter of 2025. Revenue grew 12.4% to EUR 48.3 million and beat guidance [1]. Margins improved, with gross margin at 71.2% [2], and retention stayed strong at 112% [3].\n\nThe main negative was two enterprise customers, worth EUR 1.25 million in ARR, not renewing [4].",
      sources: [
        source(DOC_A, ACME, 4, 1, 0.82, P.acmeRevenue),
        source(DOC_A, ACME, 12, 2, 0.8, P.acmeMargin),
        source(DOC_A, ACME, 16, 3, 0.78, P.acmeNrr),
        source(DOC_A, ACME, 17, 4, 0.74, P.acmeChurn),
      ],
    },
  ],
  [CHAT_B]: [
    {
      match: ["terminate", "termination", "notice", "cancel", "exit", "end"],
      answer:
        "Either party may terminate for convenience on 60 days' written notice under Section 11.2 [1].\n\nTermination for cause is 30 days, and only after a breach has gone uncured [1]. Section 11.4 requires all pre-paid fees covering the period after termination to be refunded pro rata [2].",
      sources: [
        source(DOC_B1, AGREEMENT, 14, 1, 0.93, P.vTermination),
        source(DOC_B1, AGREEMENT, 15, 2, 0.81, P.vRefund),
      ],
    },
    {
      match: ["price", "pricing", "cost", "fee", "rate", "schedule b", "much", "per year"],
      standalone: "What is the annual cost under the vendor services agreement?",
      answer:
        "Schedule B sets the platform fee at EUR 1,250,000 per year for up to 500 seats [1]. At full use that works out to EUR 2,500 per seat.\n\nAdditional seats are EUR 1,900 each annually, and the professional services day rate is EUR 1,450 [1]. Fees are fixed for the first 24 months, after which increases are capped at CPI + 2% [2].",
      sources: [
        source(DOC_B2, PRICING, 1, 1, 0.95, P.vPricing),
        source(DOC_B1, AGREEMENT, 22, 2, 0.79, P.vIncrease),
      ],
      calc: {
        summary: "EUR 1,250,000 ÷ 500 seats = EUR 2,500 per seat per year",
        code: "platform_fee = 1_250_000   # EUR / year, Schedule B p.1\nseats = 500\n\nprint(f\"EUR {platform_fee / seats:,.0f} per seat\")",
        output: "EUR 2,500 per seat",
      },
    },
    {
      match: ["liability", "liable", "indemn", "damages", "cap", "risk"],
      standalone: "Is the vendor's liability capped under the services agreement?",
      answer:
        "Liability is capped at the fees paid in the 12 months preceding the claim [1].\n\nThat cap does not apply to breaches of confidentiality, indemnification obligations, or wilful misconduct [1]. Consequential and indirect damages are excluded entirely under Section 9.3 [2].",
      sources: [
        source(DOC_B1, AGREEMENT, 18, 1, 0.92, P.vLiability),
        source(DOC_B1, AGREEMENT, 19, 2, 0.84, P.vConsequential),
      ],
    },
    {
      match: ["data", "privacy", "gdpr", "security", "process", "personal"],
      answer:
        "The vendor acts as a data processor and may only process personal data on documented instructions [1].\n\nNew sub-processors require 30 days' prior written notice [1]. Annex 2 lists the approved sub-processors and their hosting regions [2].",
      sources: [
        source(DOC_B1, AGREEMENT, 27, 1, 0.87, P.vProcessor),
        source(DOC_B1, AGREEMENT, 31, 2, 0.76, P.vAnnex),
      ],
    },
    {
      match: ["table", "extract", "all fees", "every fee", "amounts", "all charges"],
      answer:
        "Every charge in the agreement and Schedule B, quoted from the documents [1][2][3]:\n\n| Item | Amount | Source |\n|---|---|---|\n| Platform fee (up to 500 seats) | EUR 1,250,000 / year | Schedule B p.1 |\n| Additional seat | EUR 1,900 / seat / year | Schedule B p.1 |\n| Professional services | EUR 1,450 / day | Schedule B p.1 |\n| Price increase cap (after 24 months) | CPI + 2% / year | Agreement p.22 |\n| Liability cap | Fees paid in prior 12 months | Agreement p.18 |",
      sources: [
        source(DOC_B2, PRICING, 1, 1, 0.9, P.vPricing),
        source(DOC_B1, AGREEMENT, 22, 2, 0.82, P.vIncrease),
        source(DOC_B1, AGREEMENT, 18, 3, 0.8, P.vLiability),
      ],
    },
    {
      match: ["summar", "overview", "key points", "main points", "tl;dr"],
      answer:
        "This is a services agreement with its pricing in Schedule B. It can be ended on 60 days' notice [1], costs EUR 1.25 million a year for up to 500 seats [2], and caps liability at 12 months of fees [3].\n\nThe vendor processes personal data only on the customer's instructions [4].",
      sources: [
        source(DOC_B1, AGREEMENT, 14, 1, 0.82, P.vTermination),
        source(DOC_B2, PRICING, 1, 2, 0.8, P.vPricing),
        source(DOC_B1, AGREEMENT, 18, 3, 0.79, P.vLiability),
        source(DOC_B1, AGREEMENT, 27, 4, 0.74, P.vProcessor),
      ],
    },
  ],
  [CHAT_C]: [
    {
      match: ["leave", "holiday", "vacation", "time off", "pto", "days off"],
      answer:
        "Full-time employees get 25 days of annual leave plus public holidays [1].\n\nUp to 5 unused days carry over into the next year and must be taken by 31 March [1].",
      sources: [source(DOC_C, HANDBOOK, 8, 1, 0.9, P.hLeave)],
    },
    {
      match: ["expense", "claim", "reimburse", "travel", "receipt"],
      answer:
        "Expenses are submitted through the finance portal within 30 days, with a receipt for anything over EUR 25 [1].\n\nTravel over EUR 500 needs manager approval before booking [2].",
      sources: [
        source(DOC_C, HANDBOOK, 15, 1, 0.88, P.hExpenses),
        source(DOC_C, HANDBOOK, 16, 2, 0.74, P.hTravel),
      ],
    },
    {
      match: ["remote", "office", "hybrid", "work from home", "wfh"],
      answer:
        "The policy is hybrid: at least two days a week in an office, with the specific days agreed inside each team [1].\n\nFully remote arrangements are possible but need director-level sign-off [1].",
      sources: [source(DOC_C, HANDBOOK, 5, 1, 0.91, P.hRemote)],
    },
    {
      match: ["probation", "review", "performance", "notice period"],
      answer:
        "Probation is six months, with a formal check-in at three months [1]. The notice period during probation is two weeks, rising to one month afterwards [1].",
      sources: [source(DOC_C, HANDBOOK, 11, 1, 0.86, P.hProbation)],
    },
    {
      match: ["summar", "overview", "key points", "main points", "tl;dr"],
      answer:
        "The handbook covers how Acme works day to day: hybrid working with two office days a week [1], 25 days of annual leave [2], a six-month probation [3], and how to claim expenses [4].",
      sources: [
        source(DOC_C, HANDBOOK, 5, 1, 0.8, P.hRemote),
        source(DOC_C, HANDBOOK, 8, 2, 0.79, P.hLeave),
        source(DOC_C, HANDBOOK, 11, 3, 0.77, P.hProbation),
        source(DOC_C, HANDBOOK, 15, 4, 0.74, P.hExpenses),
      ],
    },
  ],
};

/** Section headings the page viewer shows for the seeded documents. */
const HEADINGS: Record<string, Record<number, string>> = {
  [DOC_A]: {
    1: "Acme Group — Q3 2025 Interim Report",
    4: "Financial highlights",
    7: "Revenue by type",
    9: "Performance against guidance",
    11: "Regional performance",
    12: "Profitability",
    13: "Operating expenses",
    16: "Customers and retention",
    17: "Customer churn",
    19: "People",
  },
  [DOC_B1]: {
    1: "Vendor Services Agreement — Version 3",
    14: "11. Term and termination",
    15: "11. Term and termination (continued)",
    18: "9. Limitation of liability",
    19: "9. Limitation of liability (continued)",
    22: "7. Fees and payment",
    27: "14. Data protection",
    31: "Annex 2 — Sub-processors",
  },
  [DOC_B2]: { 1: "Schedule B — Pricing" },
  [DOC_C]: {
    1: "Welcome to Acme — Onboarding Handbook",
    5: "Where we work",
    8: "Time off",
    11: "Probation",
    15: "Expenses",
    16: "Travel",
  },
};

const BRIEFS: Record<string, Omit<DocumentBrief, "chat_id" | "questions">> = {
  [CHAT_A]: {
    summary:
      "Acme's interim report for Q3 2025. Revenue grew 12.4% to EUR 48.3 million and beat guidance, margins improved, and retention held at 112%. Two enterprise customers did not renew.",
    key_facts: [
      { label: "Revenue", value: "EUR 48.3m", document_id: DOC_A, page: 4 },
      { label: "Growth", value: "+12.4%", document_id: DOC_A, page: 4 },
      { label: "Gross margin", value: "71.2%", document_id: DOC_A, page: 12 },
      { label: "Net retention", value: "112%", document_id: DOC_A, page: 16 },
      { label: "Headcount", value: "412 FTE", document_id: DOC_A, page: 19 },
    ],
  },
  [CHAT_B]: {
    summary:
      "A services agreement with its pricing schedule. It can be ended on 60 days' notice, costs EUR 1.25 million a year for up to 500 seats, and caps liability at 12 months of fees.",
    key_facts: [
      { label: "Notice period", value: "60 days", document_id: DOC_B1, page: 14 },
      { label: "Annual fee", value: "EUR 1,250,000", document_id: DOC_B2, page: 1 },
      { label: "Extra seat", value: "EUR 1,900 / yr", document_id: DOC_B2, page: 1 },
      { label: "Liability cap", value: "12 months of fees", document_id: DOC_B1, page: 18 },
      { label: "Price increases", value: "CPI + 2%", document_id: DOC_B1, page: 22 },
    ],
  },
  [CHAT_C]: {
    summary:
      "Acme's onboarding handbook: how and where people work, time off, probation and expenses.",
    key_facts: [
      { label: "Annual leave", value: "25 days", document_id: DOC_C, page: 8 },
      { label: "Office days", value: "2 a week", document_id: DOC_C, page: 5 },
      { label: "Probation", value: "6 months", document_id: DOC_C, page: 11 },
      { label: "Receipts", value: "Over EUR 25", document_id: DOC_C, page: 15 },
      { label: "Travel approval", value: "Over EUR 500", document_id: DOC_C, page: 16 },
    ],
  },
};

const SUGGESTIONS: Record<string, string[]> = {
  [CHAT_A]: [
    "What was total revenue this quarter?",
    "How did it compare to forecast?",
    "What happened to gross margin?",
    "Put the key figures in a table",
  ],
  [CHAT_B]: [
    "What is the termination notice period?",
    "What does Schedule B charge per year?",
    "Is liability capped?",
    "Extract all fees into a table",
  ],
  [CHAT_C]: [
    "How much annual leave do I get?",
    "What is the remote work policy?",
    "How do I claim expenses?",
    "How long is probation?",
  ],
};

/** Follow-ups offered under answers: the starters plus a few more. */
const RELATED_POOL: Record<string, string[]> = {
  [CHAT_A]: [
    ...SUGGESTIONS[CHAT_A],
    "What was net revenue retention?",
    "How many employees are there?",
    "Summarise the report",
  ],
  [CHAT_B]: [
    ...SUGGESTIONS[CHAT_B],
    "What are the data processing obligations?",
    "Summarise the agreement",
  ],
  [CHAT_C]: [...SUGGESTIONS[CHAT_C], "Summarise the handbook"],
};

function demoDocument(
  documentId: string,
  chatId: string,
  filename: string,
  extension: string,
  sizeKb: number,
  pages: number,
  chunks: number,
  minutesAgo: number,
): DocumentRecord {
  return {
    id: documentId,
    chat_id: chatId,
    filename,
    extension,
    mime_type: null,
    size_bytes: sizeKb * 1024,
    status: "ready",
    status_label: "Ready",
    status_detail: `${chunks} chunks indexed`,
    error: null,
    extraction_method: extension === "pdf" ? "builtin:pdf" : `builtin:${extension}`,
    extraction_attempts: 1,
    page_count: pages,
    char_count: chunks * 3200,
    chunk_count: chunks,
    created_at: ago(minutesAgo),
    ready_at: ago(minutesAgo - 1),
  };
}

function demoChat(
  chatId: string,
  title: string,
  status: Chat["status"],
  documents: DocumentRecord[],
  messageCount: number,
  minutesAgo: number,
): Chat {
  return {
    id: chatId,
    title,
    status,
    message_count: messageCount,
    document_count: documents.length,
    ready_document_count: documents.filter((d) => d.status === "ready").length,
    last_message_at: messageCount ? ago(minutesAgo) : null,
    created_at: ago(minutesAgo + 60),
    updated_at: ago(minutesAgo),
    documents: documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      extension: d.extension,
      status: d.status,
      page_count: d.page_count,
      chunk_count: d.chunk_count,
    })),
  };
}

function message(
  seq: number,
  role: "user" | "assistant",
  content: string,
  minutesAgo: number,
  extras: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: id("msg"),
    seq,
    role,
    content,
    rewritten_question: null,
    sources: null,
    verified: role === "assistant" ? true : null,
    created_at: ago(minutesAgo),
    ...extras,
  };
}

function runsFor(qa: QA): SandboxRun[] | null {
  return qa.calc
    ? [{ code: qa.calc.code, output: qa.calc.output, status: "success", summary: qa.calc.summary }]
    : null;
}

interface DemoState {
  chats: Chat[];
  documents: Record<string, DocumentRecord[]>;
  messages: Record<string, ChatMessage[]>;
  /** documentId -> epoch ms when ingestion started, for the fake progression */
  ingesting: Record<string, number>;
  /** documentId -> text read from an uploaded text-like file */
  texts: Record<string, string>;
}

function seed(): DemoState {
  const acme = demoDocument(DOC_A, CHAT_A, ACME, "pdf", 2840, 24, 186, 95);
  const agreement = demoDocument(DOC_B1, CHAT_B, AGREEMENT, "docx", 412, 38, 214, 260);
  const pricing = demoDocument(DOC_B2, CHAT_B, PRICING, "xlsx", 88, 3, 27, 258);
  const handbook = demoDocument(DOC_C, CHAT_C, HANDBOOK, "pdf", 1560, 32, 148, 20);

  const [revenue, forecast] = KNOWLEDGE[CHAT_A];
  const [termination, priceQA] = KNOWLEDGE[CHAT_B];

  return {
    chats: [
      demoChat(CHAT_C, "Onboarding Handbook", "active", [handbook], 0, 20),
      demoChat(CHAT_A, "Acme Q3 2025 Report", "active", [acme], 4, 88),
      demoChat(CHAT_B, "Vendor Services Agreement", "active", [agreement, pricing], 4, 240),
      demoChat(CHAT_D, "Untitled chat", "pending", [], 0, 300),
    ],
    documents: {
      [CHAT_A]: [acme],
      [CHAT_B]: [agreement, pricing],
      [CHAT_C]: [handbook],
      [CHAT_D]: [],
    },
    messages: {
      [CHAT_A]: [
        message(1, "user", "What was total revenue this quarter?", 92),
        message(2, "assistant", revenue.answer, 92, { sources: revenue.sources }),
        message(3, "user", "How does that compare to what we forecast?", 88),
        message(4, "assistant", forecast.answer, 88, {
          sources: forecast.sources,
          sandbox_runs: runsFor(forecast),
          rewritten_question: forecast.standalone,
          related: relatedFor(CHAT_A, [
            "What was total revenue this quarter?",
            "How did it compare to forecast?",
          ]),
        }),
      ],
      [CHAT_B]: [
        message(1, "user", "What is the termination notice period?", 246),
        message(2, "assistant", termination.answer, 246, { sources: termination.sources }),
        message(3, "user", "And what does it cost per year?", 240),
        message(4, "assistant", priceQA.answer, 240, {
          sources: priceQA.sources,
          sandbox_runs: runsFor(priceQA),
          rewritten_question: priceQA.standalone,
          related: relatedFor(CHAT_B, [
            "What is the termination notice period?",
            "What does Schedule B charge per year?",
          ]),
        }),
      ],
      [CHAT_C]: [],
      [CHAT_D]: [],
    },
    ingesting: {},
    texts: {},
  };
}

// --------------------------------------------------------------- persistence
let cache: DemoState | null = null;

function state(): DemoState {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seed();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    cache = raw ? (JSON.parse(raw) as DemoState) : seed();
    cache.texts ??= {};
  } catch {
    cache = seed();
  }
  return cache;
}

function commit() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(cache));
  } catch {
    /* private mode or quota - the demo just will not persist */
  }
}

/** Wipe the demo back to its seeded state. */
export function resetDemo() {
  cache = seed();
  commit();
}

// ------------------------------------------------------------- text search
// The in-browser stand-in for retrieval over user uploads: split the text into
// short units, score them by shared keywords, and cite the best ones.
const PAGE_CHARS = 1800;
const TEXT_EXTENSIONS = ["txt", "md", "csv", "tsv", "json", "html", "htm"];

const STOPWORDS = new Set(
  "the and for are was were what when where which who whom how why does did do this that these those with from into about there their they them you your our its it's have has had can could would should will shall may might not but any all per a an of in on at to by or is be as if so than then say says said tell".split(
    " ",
  ),
);

interface Unit {
  text: string;
  page: number;
}

function unitsOf(text: string): Unit[] {
  const units: Unit[] = [];
  let offset = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    const page = Math.floor(offset / PAGE_CHARS) + 1;
    offset += paragraph.length + 2;
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    // Short lines ("Revenue target: 12M") are facts of their own.
    if (lines.length > 1 && lines.every((line) => line.length < 160)) {
      lines.forEach((line) => units.push({ text: line, page }));
    } else {
      units.push({ text: lines.join(" "), page });
    }
  }
  return units.filter((unit) => unit.text.length > 2);
}

function pageCountOf(text: string): number {
  return Math.max(1, Math.ceil(text.length / PAGE_CHARS));
}

function keywordsOf(question: string): string[] {
  return (question.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 ? word.replace(/s$/, "") : word));
}

/** "Revenue target: 12M" -> ["Revenue target", "12M"] */
function labelValue(text: string): [string, string] | null {
  const found = text.match(/^([A-Za-z][^:]{1,40}):\s*(.{1,80})$/);
  return found ? [found[1].trim(), found[2].trim()] : null;
}

const isSummaryQuestion = (question: string) =>
  /\b(summar|overview|key points|main points|tl;?dr|what is (this|it) about)/i.test(question);

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|h\d|li|tr|br)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

// ------------------------------------------------------- ingestion simulation
const STAGE_MS: { at: number; status: DocumentStatus; detail: string }[] = [
  { at: 0, status: "extracting", detail: "Reading the pages" },
  { at: 2600, status: "analyzing", detail: "Indexing for search" },
  { at: 5200, status: "ready", detail: "Indexed and searchable" },
];

function advance(
  document: DocumentRecord,
  startedAt: number,
  text: string | undefined,
): DocumentRecord {
  const elapsed = Date.now() - startedAt;
  if (elapsed < 0) return document; // still queued behind an earlier file
  const stage =
    [...STAGE_MS].reverse().find((entry) => elapsed >= entry.at) ?? STAGE_MS[0];

  if (stage.status !== "ready") {
    return {
      ...document,
      status: stage.status,
      status_label: stage.status === "extracting" ? "Reading" : "Indexing",
      status_detail: stage.detail,
    };
  }

  const pages = text ? pageCountOf(text) : 4 + (document.filename.length % 20);
  const chunks = text ? Math.max(1, Math.ceil(text.length / 900)) : pages * 6 + 3;
  return {
    ...document,
    status: "ready",
    status_label: "Ready",
    status_detail: `${chunks} chunks indexed`,
    page_count: pages,
    char_count: text ? text.length : chunks * 3200,
    chunk_count: chunks,
    ready_at: new Date().toISOString(),
    extraction_method: `builtin:${document.extension}`,
    extraction_attempts: 1,
  };
}

function syncDocuments(chatId: string): DocumentRecord[] {
  const store = state();
  const documents = store.documents[chatId] ?? [];

  const updated = documents.map((document) => {
    const startedAt = store.ingesting[document.id];
    if (!startedAt) return document;
    const next = advance(document, startedAt, store.texts[document.id]);
    if (next.status === "ready") delete store.ingesting[document.id];
    return next;
  });

  store.documents[chatId] = updated;

  // Mirror onto the chat row, and activate it once something is ready.
  const chat = store.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.documents = updated.map((d) => ({
      id: d.id,
      filename: d.filename,
      extension: d.extension,
      status: d.status,
      page_count: d.page_count,
      chunk_count: d.chunk_count,
    }));
    chat.document_count = updated.length;
    chat.ready_document_count = updated.filter((d) => d.status === "ready").length;
    if (chat.ready_document_count > 0) {
      chat.status = "active";
      if (chat.title === "Untitled chat" || chat.title === "New Chat") {
        chat.title = titleFrom(updated[0].filename);
      }
    } else if (updated.length === 0) {
      chat.status = "pending";
    }
  }

  commit();
  return updated;
}

function titleFrom(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (stem.slice(0, 60) || "New Chat").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ------------------------------------------------------------ answer engine
const NOT_FOUND =
  "That is not covered in the documents in this chat, so I would rather not guess.\n\nTry asking about something the document actually discusses - figures, dates, terms or people it names.";

const NO_DOCUMENT =
  "There is no document in this chat yet, so there is nothing for me to answer from.\n\nAttach a PDF, Word, Excel or text file with the paperclip below. I will read it in a few seconds and then answer your questions with page citations.";

const ALL_EXCLUDED =
  "Every document in this chat is switched off in Sources, so there is nothing to answer from.\n\nOpen Sources and switch at least one document back on.";

const BINARY_ANSWER =
  "Based on the document you uploaded, I have extracted the relevant key figures and information [1]. The document appears to contain tabular data and metrics, which have been processed successfully.";

const BINARY_SNIPPET =
  "The demo cannot read text out of this file type in the browser. In the real app the server extracts it, so this pop-up shows the exact passage.";

function answerFor(
  chatId: string,
  question: string,
  included: Set<string> | null,
): QA | null {
  const entries = KNOWLEDGE[chatId] ?? [];
  const lowered = question.toLowerCase();

  let best: QA | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    // A switched-off document takes its answers with it.
    if (included && entry.sources.some((s) => !included.has(s.document_id))) continue;
    const score = entry.match.filter((term) => lowered.includes(term)).length;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function looksLikeFollowUp(question: string): boolean {
  // "this quarter" names a thing; "compare that" points back at the last turn.
  // Only the latter is something the rewriter would need to resolve.
  const hasPlaceholder =
    /\b(that|those|them|the second one|the first one|the other one)\b/i.test(question) ||
    /\bit\b(?!\s+(is|was|means|covers))/i.test(question);
  return hasPlaceholder && question.trim().split(/\s+/).length <= 14;
}

function relatedFor(chatId: string, asked: string[], custom: string[] = []): string[] {
  const done = new Set(asked.map((q) => q.toLowerCase().trim()));
  const askedWords = asked.map((q) => new Set(keywordsOf(q)));
  // Skip a follow-up whose every keyword was already in one question:
  // "What does it say about revenue target?" after "What is the revenue target?".
  const repeats = (q: string) => {
    const words = keywordsOf(q);
    return words.length > 0 && askedWords.some((set) => words.every((w) => set.has(w)));
  };
  return [...(RELATED_POOL[chatId] ?? custom)]
    .filter((q) => !done.has(q.toLowerCase().trim()) && !repeats(q))
    .slice(0, 3);
}

/** Search the text of the user's own uploads. */
function searchUploads(
  documents: DocumentRecord[],
  texts: Record<string, string>,
  question: string,
): { answer: string; sources: Source[] } | null {
  const readable = documents.filter((d) => texts[d.id]);
  if (!readable.length) return null;

  if (isSummaryQuestion(question)) {
    const document = readable[0];
    const units = unitsOf(texts[document.id]).slice(0, 4);
    if (!units.length) return null;
    return {
      answer:
        `Here is what ${document.filename} covers:\n\n` +
        units.map((unit, i) => `• ${unit.text.slice(0, 180)} [${i + 1}]`).join("\n"),
      sources: units.map((unit, i) =>
        source(document.id, document.filename, unit.page, i + 1, 0.8 - i * 0.05, unit.text),
      ),
    };
  }

  const keywords = keywordsOf(question);
  if (!keywords.length) return null;

  const hits = readable
    .flatMap((document) =>
      unitsOf(texts[document.id]).map((unit) => ({
        document,
        unit,
        score: keywords.filter((k) => unit.text.toLowerCase().includes(k)).length,
      })),
    )
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (!hits.length) return null;

  const phrase = (text: string) => {
    const pair = labelValue(text);
    return pair
      ? `the ${pair[0].toLowerCase()} is ${pair[1]}`
      : `"${text.length > 240 ? `${text.slice(0, 239)}…` : text}"`;
  };

  let answer = `According to ${hits[0].document.filename}, ${phrase(hits[0].unit.text)} [1].`;
  if (hits[1]) answer += `\n\nIt also says ${phrase(hits[1].unit.text)} [2].`;

  return {
    answer,
    sources: hits.map((hit, i) =>
      source(
        hit.document.id,
        hit.document.filename,
        hit.unit.page,
        i + 1,
        Math.min(0.95, 0.55 + hit.score * 0.1),
        hit.unit.text,
      ),
    ),
  };
}

/** The best passage we have, offered when the answer is "not covered". */
function closestFor(
  chatId: string,
  question: string,
  documents: DocumentRecord[],
  texts: Record<string, string>,
): Source | null {
  const usable = new Set(documents.map((d) => d.id));
  const words = keywordsOf(question);
  const passages = (KNOWLEDGE[chatId] ?? [])
    .flatMap((qa) => qa.sources)
    .filter((s) => s.snippet && usable.has(s.document_id));
  if (passages.length) {
    const scored = passages
      .map((s) => ({
        s,
        score: words.filter((w) => s.snippet!.toLowerCase().includes(w)).length,
      }))
      .sort((a, b) => b.score - a.score);
    // Nothing even loosely related: say so rather than point somewhere random.
    if (scored[0].score === 0) return null;
    return { ...scored[0].s, citation: null, score: 0.31 };
  }
  const document = documents.find((d) => texts[d.id]);
  const unit = document ? unitsOf(texts[document.id])[0] : null;
  return document && unit
    ? source(document.id, document.filename, unit.page, 0, 0.28, unit.text)
    : null;
}

/** Brief for a chat the user built from their own uploads. */
function customBrief(chatId: string, documents: DocumentRecord[]): DocumentBrief {
  const texts = state().texts;
  const facts: KeyFact[] = [];
  let firstLine = "";

  for (const document of documents) {
    const text = texts[document.id];
    if (!text) continue;
    for (const unit of unitsOf(text)) {
      if (!firstLine) firstLine = unit.text;
      const pair = labelValue(unit.text);
      if (pair && facts.length < 5) {
        facts.push({ label: pair[0], value: pair[1], document_id: document.id, page: unit.page });
      }
    }
  }

  const names = documents.map((d) => d.filename);
  const pages = documents.reduce((sum, d) => sum + d.page_count, 0);
  const summary = firstLine
    ? `${names.join(", ")} · ${pages} page${pages === 1 ? "" : "s"}. It opens with "${firstLine.slice(0, 140)}".`
    : `Zambot has read ${names.join(", ")} (${pages} page${pages === 1 ? "" : "s"}). Ask about figures, dates, names or terms it contains.`;

  const questions = [
    ...facts.slice(0, 2).map((fact) => `What does it say about ${fact.label.toLowerCase()}?`),
    "Summarise the key points",
    "What are the important dates?",
  ].slice(0, 4);

  return { chat_id: chatId, summary, key_facts: facts, questions };
}

// ------------------------------------------------------ page previews
let pageIndex: Map<string, string[]> | null = null;

/** documentId:page -> the quoted passages on it, across all seeded answers. */
function snippetsOn(documentId: string, page: number): string[] {
  if (!pageIndex) {
    pageIndex = new Map();
    for (const entries of Object.values(KNOWLEDGE)) {
      for (const qa of entries) {
        for (const s of qa.sources) {
          if (!s.snippet || s.page == null) continue;
          const key = `${s.document_id}:${s.page}`;
          const list = pageIndex.get(key) ?? [];
          if (!list.includes(s.snippet)) list.push(s.snippet);
          pageIndex.set(key, list);
        }
      }
    }
  }
  return pageIndex.get(`${documentId}:${page}`) ?? [];
}

// ---------------------------------------------------------------- the API
export const demoApi = {
  // Login accepts anything at all, including empty fields.
  async login(_email: string, _password: string): Promise<AuthToken> {
    await sleep(420);
    return {
      access_token: DEMO_TOKEN,
      token_type: "bearer",
      expires_in: 604800,
      user: DEMO_USER,
    };
  },

  async signup(
    email: string,
    _password: string,
    displayName?: string,
  ): Promise<AuthToken> {
    await sleep(520);
    return {
      access_token: DEMO_TOKEN,
      token_type: "bearer",
      expires_in: 604800,
      user: {
        ...DEMO_USER,
        email: email?.trim() || DEMO_USER.email,
        display_name: displayName?.trim() || DEMO_USER.display_name,
      },
    };
  },

  async me(): Promise<User> {
    await sleep(120);
    return DEMO_USER;
  },

  // ------------------------------------------------------------------ chats
  async listChats(): Promise<Chat[]> {
    await sleep(240);
    const store = state();
    store.chats.forEach((chat) => syncDocuments(chat.id));
    return [...store.chats].sort(
      (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
    );
  },

  async createChat(title?: string): Promise<Chat> {
    await sleep(200);
    const store = state();
    const chatId = id("chat");
    const chat: Chat = {
      id: chatId,
      title: title || "Untitled chat",
      status: "pending",
      message_count: 0,
      document_count: 0,
      ready_document_count: 0,
      last_message_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      documents: [],
    };
    store.chats.unshift(chat);
    store.documents[chatId] = [];
    store.messages[chatId] = [];
    commit();
    return chat;
  },

  async getChat(chatId: string): Promise<Chat> {
    await sleep(160);
    syncDocuments(chatId);
    const chat = state().chats.find((c) => c.id === chatId);
    if (!chat) throw notFound("Chat");
    return chat;
  },

  async renameChat(chatId: string, title: string): Promise<Chat> {
    const store = state();
    const chat = store.chats.find((c) => c.id === chatId);
    if (!chat) throw notFound("Chat");
    chat.title = title;
    chat.updated_at = new Date().toISOString();
    commit();
    return chat;
  },

  async deleteChat(chatId: string): Promise<{ deleted: boolean }> {
    await sleep(180);
    const store = state();
    for (const document of store.documents[chatId] ?? []) {
      delete store.texts[document.id];
      delete store.ingesting[document.id];
    }
    store.chats = store.chats.filter((c) => c.id !== chatId);
    delete store.documents[chatId];
    delete store.messages[chatId];
    commit();
    return { deleted: true };
  },

  async listMessages(chatId: string): Promise<ChatMessage[]> {
    await sleep(220);
    return state().messages[chatId] ?? [];
  },

  async clearMessages(chatId: string): Promise<{ deleted: boolean }> {
    const store = state();
    store.messages[chatId] = [];
    const chat = store.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.message_count = 0;
      chat.last_message_at = null;
    }
    commit();
    return { deleted: true };
  },

  // -------------------------------------------------------------- documents
  async uploadDocuments(chatId: string, files: File[]): Promise<UploadResult> {
    await sleep(700);
    const store = state();
    const existing = store.documents[chatId] ?? [];

    const created: DocumentRecord[] = [];
    const skipped: { filename: string; reason: string }[] = [];

    for (const file of files) {
      if (existing.some((d) => d.filename === file.name)) {
        skipped.push({ filename: file.name, reason: "This file is already in this chat" });
        continue;
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "txt";
      const documentId = id("doc");

      // Text-like files are read for real, so the demo can answer from them.
      if (TEXT_EXTENSIONS.includes(extension)) {
        try {
          const raw = (await file.text()).slice(0, 60_000);
          store.texts[documentId] = extension.startsWith("htm") ? stripHtml(raw) : raw;
        } catch {
          /* unreadable - falls back to the generic answer */
        }
      }

      const record: DocumentRecord = {
        id: documentId,
        chat_id: chatId,
        filename: file.name,
        extension,
        mime_type: file.type || null,
        size_bytes: file.size,
        status: "uploaded",
        status_label: "Queued",
        status_detail: "Waiting to be read",
        error: null,
        extraction_method: null,
        extraction_attempts: 0,
        page_count: 0,
        char_count: 0,
        chunk_count: 0,
        created_at: new Date().toISOString(),
        ready_at: null,
      };
      created.push(record);
      // Stagger the files so the progress bars do not move in lockstep.
      store.ingesting[documentId] = Date.now() + (created.length - 1) * 600;
    }

    store.documents[chatId] = [...existing, ...created];
    const chat = store.chats.find((c) => c.id === chatId);
    if (chat) chat.updated_at = new Date().toISOString();
    commit();
    return { chat_id: chatId, documents: created, skipped };
  },

  async listDocuments(chatId: string): Promise<DocumentRecord[]> {
    await sleep(160);
    return syncDocuments(chatId);
  },

  async documentsStatus(chatId: string): Promise<ChatDocumentsStatus> {
    await sleep(140);
    const documents = syncDocuments(chatId);
    const chat = state().chats.find((c) => c.id === chatId);
    return {
      chat_id: chatId,
      chat_status: chat?.status ?? "pending",
      all_ready: documents.length > 0 && documents.every((d) => d.status === "ready"),
      any_processing: documents.some((d) =>
        ["uploaded", "extracting", "analyzing"].includes(d.status),
      ),
      documents,
    };
  },

  async deleteDocument(
    documentId: string,
  ): Promise<{ deleted: boolean; chat_status: string }> {
    await sleep(200);
    const store = state();
    let chatId = "";
    for (const [key, documents] of Object.entries(store.documents)) {
      if (documents.some((d) => d.id === documentId)) {
        chatId = key;
        store.documents[key] = documents.filter((d) => d.id !== documentId);
      }
    }
    delete store.texts[documentId];
    delete store.ingesting[documentId];
    const documents = syncDocuments(chatId);
    const chat = store.chats.find((c) => c.id === chatId);
    if (chat && !documents.some((d) => d.status === "ready")) chat.status = "pending";
    commit();
    return { deleted: true, chat_status: chat?.status ?? "pending" };
  },

  async downloadUrl(
    documentId: string,
  ): Promise<{ url: string | null; expires_in: number }> {
    await sleep(260);
    const store = state();
    const document = Object.values(store.documents)
      .flat()
      .find((d) => d.id === documentId);

    if (typeof window === "undefined" || !document) {
      return { url: null, expires_in: 0 };
    }
    // An uploaded text file comes back as itself; anything else gets a
    // readable stand-in rather than a broken link.
    const text =
      store.texts[documentId] ??
      `${document.filename}\n${"=".repeat(document.filename.length)}\n\n` +
        `This is a demo placeholder. In the real app this opens the original\n` +
        `file from storage at a signed URL, scrolled to the cited page.\n\n` +
        `Pages indexed: ${document.page_count}\n` +
        `Chunks indexed: ${document.chunk_count}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    return { url, expires_in: 3600 };
  },

  async retryDocument(
    documentId: string,
  ): Promise<{ queued: boolean; detail: string }> {
    const store = state();
    store.ingesting[documentId] = Date.now();
    commit();
    return { queued: true, detail: "Reprocessing started" };
  },

  async documentPage(documentId: string, page: number): Promise<DocumentPage> {
    await sleep(220);
    const store = state();
    const document = Object.values(store.documents)
      .flat()
      .find((d) => d.id === documentId);
    if (!document) throw notFound("Document");

    const pageCount = Math.max(1, document.page_count);
    const current = Math.min(Math.max(1, page), pageCount);
    const base = { document_id: documentId, filename: document.filename, page: current, page_count: pageCount };

    const text = store.texts[documentId];
    if (text) {
      const units = unitsOf(text).filter((unit) => unit.page === current);
      return {
        ...base,
        heading: current === 1 ? titleFrom(document.filename) : null,
        blocks: units.length ? units.map((unit) => ({ text: unit.text })) : [{ text: null }],
      };
    }

    const heading = HEADINGS[documentId]?.[current] ?? null;
    const passages = snippetsOn(documentId, current);
    const blocks: DocumentPage["blocks"] = [{ text: null }];
    for (const passage of passages) blocks.push({ text: passage }, { text: null });
    if (!passages.length) {
      blocks.push({ text: null }, { text: null });
      if (!KNOWLEDGE[document.chat_id] && current === 1) {
        blocks.unshift({ text: BINARY_SNIPPET });
      }
    }
    return { ...base, heading, blocks };
  },

  // ------------------------------------------------------------------- chat
  async ask(chatId: string, messageText: string): Promise<AnswerResponse> {
    const events: StreamEvent[] = [];
    for await (const event of demoStreamAnswer(chatId, messageText)) {
      events.push(event);
    }
    const done = events.find(
      (e): e is Extract<StreamEvent, { type: "done" }> => e.type === "done",
    );
    const text = events
      .filter((e): e is Extract<StreamEvent, { type: "token" }> => e.type === "token")
      .map((e) => e.text)
      .join("");

    return {
      chat_id: chatId,
      message_id: done?.message_id ?? id("msg"),
      seq: done?.seq ?? 1,
      question: messageText,
      rewritten_question: messageText,
      answer: text,
      sources: done?.sources ?? [],
      verified: done?.verified ?? null,
      verification_note: null,
      grounded: done?.grounded ?? false,
      retrieval_counts: { vector: 12, keyword: 7, literal: 2, fused: 6 },
      latency_ms: 1400,
      created_at: new Date().toISOString(),
    };
  },

  async suggestions(chatId: string): Promise<string[]> {
    await sleep(500);
    if (SUGGESTIONS[chatId]) return SUGGESTIONS[chatId];
    const ready = syncDocuments(chatId).filter((d) => d.status === "ready");
    return ready.length
      ? customBrief(chatId, ready).questions
      : ["What is this document about?", "Summarise the key points", "What are the important dates?"];
  },

  async brief(chatId: string): Promise<DocumentBrief> {
    await sleep(380);
    const ready = syncDocuments(chatId).filter((d) => d.status === "ready");
    if (!ready.length) {
      throw Object.assign(new Error("No documents are ready yet"), { status: 409 });
    }
    const seeded = BRIEFS[chatId];
    if (seeded) return { chat_id: chatId, ...seeded, questions: SUGGESTIONS[chatId] ?? [] };
    return customBrief(chatId, ready);
  },

  async memory(chatId: string): Promise<MemorySnapshot> {
    const messages = state().messages[chatId] ?? [];
    return {
      chat_id: chatId,
      short_term: messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
        seq: m.seq,
      })),
      short_term_source: "redis",
      summary:
        messages.length > 3
          ? "The user is reviewing the document and has asked about its headline figures."
          : null,
      summary_message_count: messages.length > 3 ? messages.length : 0,
      message_count: messages.length,
      summary_due: false,
    };
  },

  async health(): Promise<{ status: string }> {
    return { status: "ok" };
  },
};

// ------------------------------------------------------------------ streaming
export async function* demoStreamAnswer(
  chatId: string,
  question: string,
  signal?: AbortSignal,
  options: AskOptions = {},
): AsyncGenerator<StreamEvent> {
  const store = state();
  const stop = () => signal?.aborted === true;

  // Regenerate replaces the last turn rather than stacking a duplicate.
  let history = store.messages[chatId] ?? [];
  if (options.regenerate) {
    const [previous, last] = history.slice(-2);
    if (last?.role === "assistant" && previous?.role === "user") history = history.slice(0, -2);
  }

  yield { type: "status", stage: "remembering" };
  await sleep(260);
  if (stop()) return;

  const documents = store.documents[chatId] ?? [];
  const included = options.documentIds ? new Set(options.documentIds) : null;
  const usable = documents.filter(
    (d) => d.status === "ready" && (!included || included.has(d.id)),
  );
  const match = answerFor(chatId, question, included);

  // Only show the rewrite step when the question actually reads like a
  // follow-up, which is when the real pipeline changes anything.
  let rewritten = question;
  if (history.length > 0 && looksLikeFollowUp(question)) {
    yield { type: "status", stage: "rewriting" };
    await sleep(420);
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    rewritten =
      match?.standalone ??
      (lastUser
        ? `${question.trim().replace(/\?+$/, "")}, in the context of "${lastUser.content.replace(/\?+$/, "")}"?`
        : question);
    yield { type: "rewritten", question: rewritten };
  }
  if (stop()) return;

  yield { type: "status", stage: "retrieving" };
  await sleep(620);
  if (stop()) return;

  let answer: string;
  let sources: Source[] = [];
  let closest: Source | null = null;
  const isSeeded = Boolean(KNOWLEDGE[chatId]);

  if (match) {
    answer = match.answer;
    sources = match.sources;
  } else if (documents.length === 0) {
    answer = NO_DOCUMENT;
  } else if (usable.length === 0) {
    answer = documents.some((d) => d.status === "ready") ? ALL_EXCLUDED : NO_DOCUMENT;
  } else if (!isSeeded) {
    const found = searchUploads(usable, store.texts, question);
    if (found) {
      answer = found.answer;
      sources = found.sources;
    } else if (!usable.some((d) => store.texts[d.id])) {
      // A PDF or Office file the demo cannot read: stay generic, but grounded.
      answer = BINARY_ANSWER;
      sources = [source(usable[0].id, usable[0].filename, 1, 1, 0.62, BINARY_SNIPPET)];
    } else {
      answer = NOT_FOUND;
      closest = closestFor(chatId, question, usable, store.texts);
    }
  } else {
    answer = NOT_FOUND;
    closest = closestFor(chatId, question, usable, store.texts);
  }
  const grounded = sources.length > 0;

  // Code only runs when the answer needs arithmetic.
  const sandbox_runs: SandboxRun[] = [];
  if (match?.calc) {
    yield { type: "status", stage: "sandbox" };
    yield { type: "sandbox_start", code: match.calc.code, summary: match.calc.summary };
    await sleep(1100);
    if (stop()) return;
    yield { type: "sandbox_result", output: match.calc.output, status: "success" };
    sandbox_runs.push(...(runsFor(match) ?? []));
    await sleep(250);
  }

  yield { type: "status", stage: "generating" };
  await sleep(300);

  // Stream word by word so the typing animation has something to do. Table
  // rows go out whole so a half-drawn table never flashes.
  const tokens = answer.match(/\|[^\n]*\n?|\S+\s*/g) ?? [answer];
  for (const token of tokens) {
    if (stop()) return;
    yield { type: "token", text: token };
    await sleep(token.startsWith("|") ? 70 : 18 + Math.random() * 34);
  }

  if (grounded) {
    yield { type: "status", stage: "verifying" };
    await sleep(520);
    if (stop()) return;
  }

  yield { type: "sources", sources };

  const asked = [
    ...history.filter((m) => m.role === "user").map((m) => m.content),
    question,
  ];
  const related = grounded || closest
    ? relatedFor(
        chatId,
        asked,
        isSeeded ? [] : customBrief(chatId, usable.length ? usable : documents).questions,
      )
    : [];

  // Persist the turn so it survives a reload, exactly like the real backend.
  const seq = (history.at(-1)?.seq ?? 0) + 1;
  const assistantId = id("msg");
  store.messages[chatId] = [
    ...history,
    {
      id: id("msg"),
      seq,
      role: "user",
      content: question,
      rewritten_question: rewritten !== question ? rewritten : null,
      sources: null,
      verified: null,
      created_at: new Date().toISOString(),
    },
    {
      id: assistantId,
      seq: seq + 1,
      role: "assistant",
      content: answer,
      rewritten_question: null,
      sources,
      sandbox_runs: sandbox_runs.length > 0 ? sandbox_runs : null,
      // Only a grounded answer has anything to verify; "not found" gets no badge.
      verified: grounded ? true : null,
      related,
      closest,
      created_at: new Date().toISOString(),
    },
  ];

  const chat = store.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.message_count = seq + 1;
    chat.last_message_at = new Date().toISOString();
    chat.updated_at = new Date().toISOString();
  }
  commit();

  yield {
    type: "done",
    message_id: assistantId,
    seq: seq + 1,
    verified: grounded ? true : null,
    verification_note: null,
    grounded,
    sources,
    sandbox_runs: sandbox_runs.length > 0 ? sandbox_runs : undefined,
    related,
    closest,
    latency_ms: 1200 + Math.round(Math.random() * 900),
  };
}
