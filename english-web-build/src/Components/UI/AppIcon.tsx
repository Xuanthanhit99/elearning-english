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
  "âŒ‚": "home",
  "â–°": "book",
  "â–£": "notebook",
  "â—": "users",
  "â—ˆ": "shop",
  "â—†": "shield",
  "â—‡": "library",
  "â—": "settings",
  "âœ“": "check",
  "Ã—": "x",
  "â†": "chevronLeft",
  "â€º": "chevronRight",
  "âš”": "arena",
  "âš¡": "zap",
  "âš™": "settings",
  "âœ£": "sparkles",
  "â­": "star",
  "ðŸ”¥": "fire",
  "ðŸ’Ž": "diamond",
  "ðŸª™": "coin",
  "ðŸŽ": "gift",
  "ðŸ””": "bell",
  "ðŸ‘‘": "crown",
  "ðŸ†": "trophy",
  "ðŸ›¡": "shield",
  "ðŸ“–": "book",
  "ðŸ“š": "library",
  "ðŸ“˜": "book",
  "ðŸ“—": "book",
  "ðŸ“„": "pen",
  "ðŸ“": "pen",
  "ðŸŽ§": "headphones",
  "ðŸŽ™": "mic",
  "ðŸŽ™ï¸": "mic",
  "ðŸŽ¤": "mic",
  "ðŸŽ¯": "target",
  "ðŸ¤–": "bot",
  "ðŸ¦Š": "paw",
  "ðŸ¾": "paw",
  "ðŸŽ": "leaf",
  "ðŸª": "coin",
  "ðŸ£": "leaf",
  "ðŸ¥›": "diamond",
  "ðŸ”": "coin",
  "ðŸ²": "coin",
  "ðŸ€": "game",
  "ðŸ’ž": "heart",
  "ðŸ’—": "heart",
  "ðŸ›": "bath",
  "ðŸŒ™": "sparkles",
  "ðŸ§ ": "brain",
  "ðŸŽ½": "shield",
  "ðŸ§¸": "game",
  "ðŸ¥š": "award",
  "ðŸ‘•": "shield",
  "ðŸ‘¨": "users",
  "ðŸ‘©": "users",
  "âš½": "game",
  "ðŸ…": "award",
  "ðŸ§°": "gift",
  "ðŸ—": "settings",
  "ðŸš§": "settings",
  "ðŸ‘¥": "users",
  "ðŸ’¬": "message",
  "Aa": "pen",
  "?": "message",
  "+": "plus",
  "â–§": "library",
  "â–¥": "notebook",
  "â˜‘": "check",
  "âŒ•": "search",
  "ðŸŒ¿": "leaf",
  "ðŸŒ": "globe",
  "ðŸŒ": "globe",
  "ðŸ”Š": "volume",
  "ðŸ”": "sparkles",
  "ðŸ”¤": "book",
  "ðŸ§¾": "notebook",
  spark: "sparkles",
};

const labelMap: Record<string, AppIconName> = {
  "Gia sư AI": "bot",
  "Báº¡n bÃ¨": "users",
  "CÃ i Ä‘áº·t": "settings",
  "Cá»™ng Ä‘á»“ng": "users",
  "Äáº¥u trÆ°á»ng": "arena",
  "Há»c táº­p": "book",
  "Há»“ sÆ¡": "paw",
  "Há»“ sÆ¡ cá»§a tÃ´i": "paw",
  "KhÃ³a há»c": "graduation",
  "Kiá»ƒm tra": "shield",
  "Kiá»ƒm tra miá»…n phÃ­": "shield",
  "Linh thÃº cá»§a tÃ´i": "paw",
  "Nghe": "headphones",
  "Nhiá»‡m vá»¥": "target",
  "NÃ³i": "mic",
  "Shop": "shop",
  "ThÃ nh tÃ­ch": "trophy",
  "ThÆ° viá»‡n": "library",
  "Tá»•ng quan": "home",
  "Trang chá»§": "home",
  "Tá»« vá»±ng": "book",
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
