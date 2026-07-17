"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppLogo from "@/src/Components/UI/AppLogo";
import { AppIcon, AppIconName } from "@/src/Components/UI/AppIcon";
import { useTranslation } from "@/src/hooks/useTranslation";
import studySidebarContent, { StudySidebarContent } from "./studySidebar.content";

type TreeItem = {
  icon?: AppIconName;
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
  children?: TreeItem[];
};

function buildLearningTree(c: StudySidebarContent): TreeItem[] {
  return [
    {
      icon: "sparkles",
      label: c.tree.lessonBuilder,
      href: "/lesson-builder",
      match: (path) => path.startsWith("/lesson-builder"),
    },
    {
      icon: "book",
      label: c.tree.overview,
      href: "/vocabulary/overview",
      match: (path) => path === "/vocabulary/overview",
    },
    {
      icon: "target",
      label: c.tree.placement,
      href: "/placement",
      match: (path) => path.startsWith("/placement"),
      children: [
        {
          label: c.tree.placementTest,
          href: "/placement",
          match: (path) =>
            path === "/placement" ||
            path === "/placement/introduction" ||
            path.startsWith("/placement/test"),
        },
        {
          label: c.tree.placementDashboard,
          href: "/placement/dashboard",
          match: (path) => path === "/placement/dashboard",
        },
      ],
    },
    {
      icon: "book",
      label: c.tree.vocabulary,
      href: "/vocabulary",
      match: (path) => path === "/vocabulary" || path.startsWith("/vocabulary/"),
      children: [
        { label: c.tree.vocabularyList, href: "/vocabulary", match: (path) => path === "/vocabulary" },
        { label: c.tree.flashcards, href: "/vocabulary/flashcards", match: (path) => path === "/vocabulary/flashcards" },
        { label: c.tree.review, href: "/vocabulary/review", match: (path) => path === "/vocabulary/review" },
        { label: c.tree.test, href: "/vocabulary/test", match: (path) => path === "/vocabulary/test" },
      ],
    },
    {
      icon: "graduation",
      label: c.tree.grammar,
      href: "/grammar",
      match: (path) => path.startsWith("/grammar"),
    },
    {
      icon: "volume",
      label: c.tree.listening,
      href: "/listening",
      match: (path) => path.startsWith("/listening"),
      children: [
        { label: c.tree.listeningPractice, href: "/listening", match: (path) => path === "/listening" },
        { label: c.tree.listeningDictation, href: "/listening/dictation", match: (path) => path === "/listening/dictation" },
        { label: c.tree.listeningReading, href: "/listening/reading", match: (path) => path === "/listening/reading" },
        { label: c.tree.listeningTopic, href: "/listening/topic", match: (path) => path === "/listening/topic" },
      ],
    },
    {
      icon: "mic",
      label: c.tree.speaking,
      href: "/speaking",
      match: (path) => path.startsWith("/speaking") || path.startsWith("/pronunciation"),
      children: [
        { label: c.tree.pronunciation, href: "/pronunciation", match: (path) => path.startsWith("/pronunciation") },
        { label: c.tree.speakingTopics, href: "/speaking/topics", match: (path) => path === "/speaking/topics" },
        { label: c.tree.speakingSituations, href: "/speaking/situations", match: (path) => path === "/speaking/situations" },
      ],
    },
    {
      icon: "book",
      label: c.tree.reading,
      href: "/reading",
      match: (path) => path.startsWith("/reading"),
      children: [
        { label: c.tree.readingOverview, href: "/reading", match: (path) => path === "/reading" },
        { label: c.tree.readingPractice, href: "/reading/readingpractice", match: (path) => path === "/reading/readingpractice" },
      ],
    },
    {
      icon: "pen",
      label: c.tree.writing,
      href: "/writing",
      match: (path) => path.startsWith("/writing") || path.startsWith("/check-writing"),
      children: [
        { label: c.tree.writingPractice, href: "/writing", match: (path) => path === "/writing" },
        { label: c.tree.writingCheck, href: "/check-writing", match: (path) => path.startsWith("/check-writing") },
      ],
    },
    {
      icon: "star",
      label: c.tree.flashcards,
      href: "/flashcards",
      match: (path) => path.startsWith("/flashcards"),
      children: [
        { label: c.tree.flashcardsToday, href: "/flashcards", match: (path) => path === "/flashcards" },
        { label: c.tree.flashcardsAll, href: "/flashcards/all", match: (path) => path === "/flashcards/all" },
        { label: c.tree.flashcardsCreate, href: "/flashcards/create", match: (path) => path === "/flashcards/create" },
      ],
    },
  ];
}

function buildCommunityItems(c: StudySidebarContent): TreeItem[] {
  return [
    { icon: "users", label: c.community.community, href: "/community", match: (path) => path === "/community" },
    { icon: "message", label: c.community.qa, href: "/community?mode=question", match: (path) => path === "/community?mode=question" },
    { icon: "trophy", label: c.community.achievements, href: "/profile", match: (path) => path.startsWith("/profile") },
  ];
}

function buildOtherItems(c: StudySidebarContent): TreeItem[] {
  return [
    { icon: "book", label: c.other.courses, href: "/courses", match: (path) => path.startsWith("/courses") },
    { icon: "shop", label: c.other.shop, href: "/pet", match: (path) => path.startsWith("/pet") },
    { icon: "settings", label: c.other.settings, href: "/profile", match: (path) => path.startsWith("/profile") },
  ];
}

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
            <SidebarLeaf key={child.href} item={child} compact />
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
  const { locale } = useTranslation();
  const c = studySidebarContent[locale];
  const learningTree = buildLearningTree(c);
  const communityItems = buildCommunityItems(c);
  const otherItems = buildOtherItems(c);

  return (
    <aside
      className={`${fixed ? "fixed left-0 top-0" : "sticky top-0"} hidden h-screen w-[286px] shrink-0 overflow-y-auto border-r border-[#e8e9f5] bg-white px-4 py-6 xl:block ${className}`}
    >
      <AppLogo />
      <nav className="mt-9 space-y-1">
        <SidebarLeaf item={{ icon: "home", label: c.navHome, href: "/" }} />
        <SidebarLeaf item={{ icon: "book", label: c.navDashboard, href: "/dashboard" }} />

        <SectionTitle>{c.sectionLearning}</SectionTitle>
        <div className="relative">
          <span className="absolute left-[27px] top-3 bottom-3 w-px bg-[#e2ddff]" />
          <div className="relative space-y-1">
            {learningTree.map((item) => (
              <TreeNode key={item.href} item={item} />
            ))}
          </div>
        </div>

        <SectionTitle>{c.sectionCommunity}</SectionTitle>
        {communityItems.map((item) => (
          <SidebarLeaf key={item.href} item={item} />
        ))}

        <SectionTitle>{c.sectionOther}</SectionTitle>
        {otherItems.map((item) => (
          <SidebarLeaf key={item.href} item={item} />
        ))}
      </nav>

      <section className="mt-8 rounded-2xl bg-[#f4f0ff] p-5">
        <AppIcon name="crown" tone="yellow" />
        <h3 className="mt-2 font-black text-[#652cff]">{c.premiumTitle}</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[#69708b]">
          {c.premiumDesc}
        </p>
        <button className="mt-5 w-full rounded-xl bg-[#6d35ff] px-4 py-3 text-sm font-black text-white">
          {c.premiumCta}
        </button>
      </section>
    </aside>
  );
}
