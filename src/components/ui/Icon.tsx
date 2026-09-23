/**
 * Icons, from Lucide (lucide-react, ISC licence - free and open source).
 *
 * One consistent, professionally drawn set instead of hand-rolled paths, and
 * one component so size and stroke stay tokenised. Pick icons by what the
 * control *does* (copy, download, new chat), never by what looks "AI".
 *
 * Never use emoji as UI affordances - they render differently per platform and
 * cannot be themed.
 */
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code,
  Copy,
  CornerDownRight,
  Download,
  Ellipsis,
  ExternalLink,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Files,
  Folder,
  Globe,
  House,
  Image,
  Layers,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  Paperclip,
  Pencil,
  Plus,
  Presentation,
  RotateCcw,
  Search,
  Send,
  Settings,
  Share,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  SquarePen,
  Sun,
  TextSearch,
  Trash2,
  Type,
  Upload,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  // navigation
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  arrowUpRight: ArrowUpRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  cornerDownRight: CornerDownRight,
  externalLink: ExternalLink,
  menu: Menu,
  home: House,

  // actions
  newChat: SquarePen,
  plus: Plus,
  close: X,
  x: X,
  check: Check,
  copy: Copy,
  download: Download,
  upload: Upload,
  share: Share,
  moreHorizontal: Ellipsis,
  dots: Ellipsis,
  trash: Trash2,
  refresh: RotateCcw,
  edit: Pencil,
  search: Search,
  findText: TextSearch,
  send: Send,
  stop: Square,
  mic: Mic,
  paperclip: Paperclip,
  logout: LogOut,
  settings: Settings,

  // content
  file: File,
  fileText: FileText,
  fileSheet: FileSpreadsheet,
  fileSlides: Presentation,
  fileCode: FileCode,
  files: Files,
  folder: Folder,
  image: Image,
  message: MessageSquare,
  book: BookOpen,
  calculator: Calculator,
  code: Code,
  lines: AlignLeft,
  layers: Layers,
  user: User,
  users: Users,
  verified: ShieldCheck,
  shield: Shield,
  alert: CircleAlert,

  // kept for older, currently unused components
  sparkle: Sparkles,
  sun: Sun,
  moon: Moon,
  type: Type,
  bookmark: Bookmark,
  zap: Zap,
  globe: Globe,
  grid: LayoutGrid,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    />
  );
}

/**
 * A file's type at a glance: the right document glyph on a softly tinted tile,
 * the way file managers show it - instead of a black "PDF" text badge.
 */
const FILE_KINDS: Record<string, { icon: IconName; tint: string }> = {
  pdf: { icon: "fileText", tint: "bg-[#FBE9E7] text-[#C0473A]" },
  doc: { icon: "fileText", tint: "bg-[#E7EEFB] text-[#3A62B8]" },
  docx: { icon: "fileText", tint: "bg-[#E7EEFB] text-[#3A62B8]" },
  xls: { icon: "fileSheet", tint: "bg-[#E6F4EA] text-[#2F7D4A]" },
  xlsx: { icon: "fileSheet", tint: "bg-[#E6F4EA] text-[#2F7D4A]" },
  csv: { icon: "fileSheet", tint: "bg-[#E6F4EA] text-[#2F7D4A]" },
  tsv: { icon: "fileSheet", tint: "bg-[#E6F4EA] text-[#2F7D4A]" },
  pptx: { icon: "fileSlides", tint: "bg-[#FDF0E3] text-[#B8651F]" },
  json: { icon: "fileCode", tint: "bg-[#EEEAF7] text-[#5B4B9A]" },
  html: { icon: "fileCode", tint: "bg-[#EEEAF7] text-[#5B4B9A]" },
  htm: { icon: "fileCode", tint: "bg-[#EEEAF7] text-[#5B4B9A]" },
};

export function FileTypeIcon({
  extension,
  size = "md",
  className,
}: {
  extension: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const kind = FILE_KINDS[extension?.toLowerCase()] ?? {
    icon: "file" as IconName,
    tint: "bg-black/[0.05] text-[rgb(var(--text))]/70",
  };
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-[10px]";
  const glyph = size === "sm" ? 15 : size === "lg" ? 20 : 17;
  return (
    <span
      aria-hidden
      title={extension?.toUpperCase()}
      className={cn("grid shrink-0 place-items-center", box, kind.tint, className)}
    >
      <Icon name={kind.icon} size={glyph} />
    </span>
  );
}
