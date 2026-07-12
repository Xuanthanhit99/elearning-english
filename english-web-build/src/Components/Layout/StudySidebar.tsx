"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppLogo from "@/src/Components/UI/AppLogo";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";

type TreeItem = {
  icon?: AppIconName;
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
  children?: TreeItem[];
};

const learningTree: TreeItem[] = [
  {
    icon: "sparkles",
    label: "AI tạo bài học",
    href: "/lesson-builder",
    match: (path) => path.startsWith("/lesson-builder"),
  },
  {
    icon: "book",
    label: "Tổng quan",
    href: "/vocabulary/overview",
    match: (path) => path === "/vocabulary/overview",
  },
  {
    icon: "target",
    label: "Xáº¿p trÃ¬nh Ä‘á»™",
    href: "/placement",
    match: (path) => path.startsWith("/placement"),
    children: [
      {
        label: "Kiá»ƒm tra trÃ¬nh Ä‘á»™",
        href: "/placement",
        match: (path) =>
          path === "/placement" ||
          path === "/placement/introduction" ||
          path.startsWith("/placement/test"),
      },
      {
        label: "Dashboard",
        href: "/placement/dashboard",
        match: (path) => path === "/placement/dashboard",
      },
    ],
  },
  {
    icon: "book",
    label: "Từ vựng",
    href: "/vocabulary",
    match: (path) => path === "/vocabulary" || path.startsWith("/vocabulary/"),
    children: [
      { label: "Danh sách từ", href: "/vocabulary", match: (path) => path === "/vocabulary" },
      { label: "Flashcards", href: "/vocabulary/flashcards", match: (path) => path === "/vocabulary/flashcards" },
      { label: "Ôn tập", href: "/vocabulary/review", match: (path) => path === "/vocabulary/review" },
      { label: "Kiểm tra", href: "/vocabulary/test", match: (path) => path === "/vocabulary/test" },
    ],
  },
  {
    icon: "graduation",
    label: "Ngữ pháp",
    href: "/grammar",
    match: (path) => path.startsWith("/grammar"),
  },
  {
    icon: "volume",
    label: "Nghe",
    href: "/listening",
    match: (path) => path.startsWith("/listening"),
    children: [
      { label: "Luyện nghe", href: "/listening", match: (path) => path === "/listening" },
      { label: "Nghe chép chính tả", href: "/listening/dictation", match: (path) => path === "/listening/dictation" },
      { label: "Nghe hiểu đoạn", href: "/listening/reading", match: (path) => path === "/listening/reading" },
      { label: "Nghe theo chủ đề", href: "/listening/topic", match: (path) => path === "/listening/topic" },
    ],
  },
  {
    icon: "mic",
    label: "Nói",
    href: "/speaking",
    match: (path) => path.startsWith("/speaking") || path.startsWith("/pronunciation"),
    children: [
      { label: "Luyện phát âm", href: "/pronunciation", match: (path) => path.startsWith("/pronunciation") },
      { label: "Chủ đề nói", href: "/speaking/topics", match: (path) => path === "/speaking/topics" },
      { label: "Tình huống", href: "/speaking/situations", match: (path) => path === "/speaking/situations" },
    ],
  },
  {
    icon: "book",
    label: "Đọc hiểu",
    href: "/reading",
    match: (path) => path.startsWith("/reading"),
    children: [
      { label: "Tổng quan đọc", href: "/reading", match: (path) => path === "/reading" },
      { label: "Luyện đọc", href: "/reading/readingpractice", match: (path) => path === "/reading/readingpractice" },
    ],
  },
  {
    icon: "pen",
    label: "Viết",
    href: "/writing",
    match: (path) => path.startsWith("/writing") || path.startsWith("/check-writing"),
    children: [
      { label: "Luyện viết", href: "/writing", match: (path) => path === "/writing" },
      { label: "AI chấm bài", href: "/check-writing", match: (path) => path.startsWith("/check-writing") },
    ],
  },
  {
    icon: "star",
    label: "Flashcards",
    href: "/flashcards",
    match: (path) => path.startsWith("/flashcards"),
    children: [
      { label: "Ôn tập hôm nay", href: "/flashcards", match: (path) => path === "/flashcards" },
      { label: "Tất cả thẻ", href: "/flashcards/all", match: (path) => path === "/flashcards/all" },
      { label: "Tạo bộ thẻ", href: "/flashcards/create", match: (path) => path === "/flashcards/create" },
    ],
  },
];

const communityItems: TreeItem[] = [
  { icon: "users", label: "Cộng đồng", href: "/community", match: (path) => path === "/community" },
  { icon: "message", label: "Hỏi đáp", href: "/community?mode=question", match: (path) => path === "/community?mode=question" },
  { icon: "trophy", label: "Thành tích", href: "/profile", match: (path) => path.startsWith("/profile") },
];

const otherItems: TreeItem[] = [
  { icon: "book", label: "Khóa học", href: "/courses", match: (path) => path.startsWith("/courses") },
  { icon: "shop", label: "Shop", href: "/pet", match: (path) => path.startsWith("/pet") },
  { icon: "settings", label: "Cài đặt", href: "/profile", match: (path) => path.startsWith("/profile") },
];

function itemActive(item: TreeItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

function branchActive(item: TreeItem, pathname: string): boolean {
  return itemActive(item, pathname) || Boolean(item.children?.some((child) => branchActive(child, pathname)));
}

function SidebarLeaf({
  item,
  compact = false,
}: {
  item: TreeItem;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = itemActive(item, pathname);

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-black transition ${
        compact ? "pl-4" : ""
      } ${
        active
          ? "bg-[#f1ecff] text-[#652cff]"
          : "text-[#101733] hover:bg-[#f7f5ff] hover:text-[#652cff]"
      }`}
    >
      {active && compact && (
        <span className="absolute -left-[31px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#6d35ff]" />
      )}
      {item.icon && (
        <AppIcon name={item.icon} tone={active ? "purple" : "slate"} bare size={17} />
      )}
      <span className="min-w-0 flex-1">{item.label}</span>
    </Link>
  );
}

function TreeNode({ item }: { item: TreeItem }) {
  const pathname = usePathname();
  const active = branchActive(item, pathname);
  const open = active && Boolean(item.children?.length);

  return (
    <div>
      <Link
        href={item.href}
        className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-black transition ${
          active
            ? "bg-[#efe9ff] text-[#652cff]"
            : "text-[#5d6587] hover:bg-[#f5f2ff] hover:text-[#652cff]"
        }`}
      >
        {item.icon && (
          <AppIcon name={item.icon} tone={active ? "purple" : "slate"} bare size={18} />
        )}
        <span className="min-w-0 flex-1">{item.label}</span>
      </Link>

      {open && (
        <div className="ml-[27px] border-l-2 border-[#e2ddff] py-1 pl-6">
          {item.children?.map((child) => (
            <SidebarLeaf key={child.label} item={child} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="px-4 pt-5 text-xs font-black uppercase tracking-wider text-[#8b91aa]">
      {children}
    </p>
  );
}

export default function StudySidebar({
  className = "",
  fixed = false,
}: {
  className?: string;
  fixed?: boolean;
}) {
  return (
    <aside
      className={`${fixed ? "fixed left-0 top-0" : "sticky top-0"} hidden h-screen w-[286px] shrink-0 overflow-y-auto border-r border-[#e8e9f5] bg-white px-4 py-6 xl:block ${className}`}
    >
      <AppLogo />
      <nav className="mt-9 space-y-1">
        <SidebarLeaf item={{ icon: "home", label: "Trang chủ", href: "/" }} />

        <SectionTitle>Học tập</SectionTitle>
        <div className="relative">
          <span className="absolute left-[27px] top-3 bottom-3 w-px bg-[#e2ddff]" />
          <div className="relative space-y-1">
            {learningTree.map((item) => (
              <TreeNode key={item.label} item={item} />
            ))}
          </div>
        </div>

        <SectionTitle>Cộng đồng</SectionTitle>
        {communityItems.map((item) => (
          <SidebarLeaf key={item.label} item={item} />
        ))}

        <SectionTitle>Khác</SectionTitle>
        {otherItems.map((item) => (
          <SidebarLeaf key={item.label} item={item} />
        ))}
      </nav>

      <section className="mt-8 rounded-2xl bg-[#f4f0ff] p-5">
        <AppIcon name="crown" tone="yellow" />
        <h3 className="mt-2 font-black text-[#652cff]">Nâng cấp Premium</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#69708b]">
          Học không giới hạn, nhận nhiều đặc quyền hấp dẫn!
        </p>
        <button className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 text-sm font-black text-white">
          Nâng cấp ngay
        </button>
      </section>
    </aside>
  );
}
