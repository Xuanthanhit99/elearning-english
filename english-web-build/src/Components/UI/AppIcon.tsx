"use client";

import {
  Award,
  Bath,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Diamond,
  Dumbbell,
  Flame,
  Gamepad2,
  Gift,
  Globe2,
  GraduationCap,
  Headphones,
  Heart,
  Home,
  Leaf,
  Library,
  Lock,
  MessageCircle,
  Mic,
  NotebookPen,
  PawPrint,
  PenLine,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
  Volume2,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const appIcons = {
  arena: Swords,
  award: Award,
  bath: Bath,
  bell: Bell,
  book: BookOpen,
  bot: Bot,
  brain: Brain,
  calendar: Calendar,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  coin: CircleDollarSign,
  crown: Crown,
  diamond: Diamond,
  exercise: Dumbbell,
  fire: Flame,
  game: Gamepad2,
  gift: Gift,
  globe: Globe2,
  graduation: GraduationCap,
  headphones: Headphones,
  heart: Heart,
  home: Home,
  leaf: Leaf,
  library: Library,
  lock: Lock,
  message: MessageCircle,
  mic: Mic,
  notebook: NotebookPen,
  paw: PawPrint,
  pen: PenLine,
  play: Play,
  plus: Plus,
  search: Search,
  settings: Settings,
  shield: Shield,
  shop: ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  trophy: Trophy,
  users: Users,
  volume: Volume2,
  wallet: Wallet,
  x: X,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof appIcons;

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  cyan: "bg-cyan-50 text-cyan-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-500",
  pink: "bg-pink-50 text-pink-500",
  purple: "bg-violet-50 text-[#6d35ff]",
  red: "bg-red-50 text-red-500",
  slate: "bg-slate-50 text-slate-600",
  yellow: "bg-amber-50 text-amber-500",
};

type AppIconProps = {
  name: AppIconName;
  tone?: keyof typeof toneClasses;
  size?: number;
  className?: string;
  bare?: boolean;
};

export function AppIcon({
  bare = false,
  className = "",
  name,
  size = 18,
  tone = "purple",
}: AppIconProps) {
  const Icon = appIcons[name];

  if (bare) {
    return <Icon aria-hidden className={className} size={size} strokeWidth={2.6} />;
  }

  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]} ${className}`}
    >
      <Icon aria-hidden size={size} strokeWidth={2.6} />
    </span>
  );
}

const legacyMap: Record<string, AppIconName> = {
  "⌂": "home",
  "▰": "book",
  "▣": "notebook",
  "●": "users",
  "◈": "shop",
  "◆": "shield",
  "◇": "library",
  "◐": "settings",
  "✓": "check",
  "×": "x",
  "←": "chevronLeft",
  "›": "chevronRight",
  "⚔": "arena",
  "⚡": "zap",
  "⚙": "settings",
  "✣": "sparkles",
  "⭐": "star",
  "🔥": "fire",
  "💎": "diamond",
  "🪙": "coin",
  "🎁": "gift",
  "🔔": "bell",
  "👑": "crown",
  "🏆": "trophy",
  "🛡": "shield",
  "📖": "book",
  "📚": "library",
  "📘": "book",
  "📗": "book",
  "📄": "pen",
  "📝": "pen",
  "🎧": "headphones",
  "🎙": "mic",
  "🎙️": "mic",
  "🎤": "mic",
  "🎯": "target",
  "🤖": "bot",
  "🦊": "paw",
  "🐾": "paw",
  "🍎": "leaf",
  "🍪": "coin",
  "🍣": "leaf",
  "🥛": "diamond",
  "🍔": "coin",
  "🍲": "coin",
  "🏀": "game",
  "💞": "heart",
  "💗": "heart",
  "🛁": "bath",
  "🌙": "sparkles",
  "🧠": "brain",
  "🎽": "shield",
  "🧸": "game",
  "🥚": "award",
  "👕": "shield",
  "👨": "users",
  "👩": "users",
  "⚽": "game",
  "🏅": "award",
  "🧰": "gift",
  "🏗": "settings",
  "🚧": "settings",
  "👥": "users",
  "💬": "message",
  "Aa": "pen",
  "?": "message",
  "+": "plus",
  "▧": "library",
  "▥": "notebook",
  "☑": "check",
  "⌕": "search",
  "🌿": "leaf",
  "🌍": "globe",
  "🌐": "globe",
  "🔊": "volume",
  "🔁": "sparkles",
  "🔤": "book",
  "🧾": "notebook",
  spark: "sparkles",
};

const labelMap: Record<string, AppIconName> = {
  "AI Tutor": "bot",
  "Bạn bè": "users",
  "Cài đặt": "settings",
  "Cộng đồng": "users",
  "Đấu trường": "arena",
  "Học tập": "book",
  "Hồ sơ": "paw",
  "Hồ sơ của tôi": "paw",
  "Khóa học": "graduation",
  "Kiểm tra": "shield",
  "Kiểm tra miễn phí": "shield",
  "Linh thú của tôi": "paw",
  "Nghe": "headphones",
  "Nhiệm vụ": "target",
  "Nói": "mic",
  "Shop": "shop",
  "Thành tích": "trophy",
  "Thư viện": "library",
  "Tổng quan": "home",
  "Trang chủ": "home",
  "Từ vựng": "book",
};

export function LegacyIcon({
  className = "",
  icon,
  label,
  size = 18,
  tone = "purple",
}: {
  className?: string;
  icon?: string;
  label?: string;
  size?: number;
  tone?: keyof typeof toneClasses;
}) {
  const cleanIcon = icon?.replace(/\ufe0f/g, "").trim() || "";
  const name = legacyMap[icon || ""] || legacyMap[cleanIcon] || labelMap[label || ""] || "sparkles";
  return <AppIcon name={name} tone={tone} size={size} className={className} />;
}
