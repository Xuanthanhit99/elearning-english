"use client";

import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Newspaper,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCommunityClub,
  joinCommunityClub,
} from "@/src/lib/community-club-api";
import type { CommunityClubDetail } from "@/src/types/community-club";
import { CommunityClubChat } from "./CommunityClubChat";
import { CommunityClubMembers } from "./CommunityClubMembers";

import { CommunityClubManagement } from "../community-club/CommunityClubManagement";
import { leaveClubSafely } from "@/src/lib/community-club-permission-api";
import { CommunityClubOverview } from "../Community/CommunityClubOverview";
import { CommunityClubPosts } from "../Community/CommunityClubPosts";
import { CommunityClubChallenges } from "../Community/CommunityClubChallenges";
import { CommunityClubEvents } from "../Community/CommunityClubEvents";
import { CommunityClubResources } from "../Community/CommunityClubResources";

type ClubTab =
  | "OVERVIEW"
  | "POSTS"
  | "CHAT"
  | "MEMBERS"
  | "CHALLENGES"
  | "EVENTS"
  | "RESOURCES"
  | "MANAGEMENT";

const baseTabs: Array<{
  key: ClubTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    key: "OVERVIEW",
    label: "Tá»•ng quan",
    icon: LayoutDashboard,
  },
  {
    key: "POSTS",
    label: "BÃ i viáº¿t",
    icon: Newspaper,
  },
  {
    key: "CHAT",
    label: "Chat nhÃ³m",
    icon: MessageCircle,
  },
  {
    key: "MEMBERS",
    label: "ThÃ nh viÃªn",
    icon: Users,
  },
  {
    key: "CHALLENGES",
    label: "Thá»­ thÃ¡ch",
    icon: Trophy,
  },
  {
    key: "EVENTS",
    label: "Sá»± kiá»‡n",
    icon: CalendarDays,
  },
  {
    key: "RESOURCES",
    label: "TÃ i liá»‡u",
    icon: FileText,
  },
];

const API_ORIGIN = (() => {
  const configured =
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3002";

  try {
    return new URL(configured).origin;
  } catch {
    return configured.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  }
})();

function resolveMediaUrl(value?: string | null): string {
  const mediaUrl = value?.trim();

  if (!mediaUrl) return "";

  if (
    mediaUrl.startsWith("http://") ||
    mediaUrl.startsWith("https://") ||
    mediaUrl.startsWith("blob:") ||
    mediaUrl.startsWith("data:")
  ) {
    return mediaUrl;
  }

  return `${API_ORIGIN}${mediaUrl.startsWith("/") ? "" : "/"}${mediaUrl}`;
}

export function CommunityClubDetailPage({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [club, setClub] = useState<CommunityClubDetail | null>(null);
  const [tab, setTab] = useState<ClubTab>("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState("");

const canManageClub =
  club?.isOwner === true ||
  club?.myRole === 'OWNER' ||
  club?.myRole === 'ADMIN';

  const tabs = useMemo(() => {
    if (!canManageClub) return baseTabs;
    return [
      ...baseTabs,
      {
        key: "MANAGEMENT" as ClubTab,
        label: "Quáº£n lÃ½",
        icon: Settings,
      },
    ];
  }, [canManageClub]);

  async function loadClub() {
    try {
      setLoading(true);
      setError("");
      setClub(await getCommunityClub(clubId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "KhÃ´ng thá»ƒ táº£i cÃ¢u láº¡c bá»™");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClub();
  }, [clubId]);

  async function toggleJoin() {
    if (!club || joinLoading) return;

    try {
      setJoinLoading(true);
      setError("");

      if (club.joined) {
        await leaveClubSafely(club.id);

        setClub((current) =>
          current
            ? {
                ...current,
                joined: false,
                myRole: null,
                memberCount: Math.max(current.memberCount - 1, 0),
              }
            : current,
        );

        setTab("OVERVIEW");
        return;
      }

      const result = await joinCommunityClub(club.id);

      if (result.status === "ACTIVE") {
        setClub((current) =>
          current
            ? {
                ...current,
                joined: true,
                myRole: "MEMBER",
                memberCount: current.memberCount + 1,
              }
            : current,
        );
      } else {
        setError(
          "YÃªu cáº§u tham gia Ä‘Ã£ Ä‘Æ°á»£c gá»­i vÃ  Ä‘ang chá» quáº£n trá»‹ viÃªn duyá»‡t.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i tham gia",
      );
    } finally {
      setJoinLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border-2 border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-12 text-center font-semibold text-slate-600 shadow-sm">
        Äang táº£i cÃ¢u láº¡c bá»™...
      </div>
    );
  }

  if (!club) {
    return (
      <div className="rounded-3xl border-2 border-[var(--BeaconVie-danger)]/30 bg-[var(--BeaconVie-danger-soft)] p-12 text-center">
        <h2 className="font-extrabold text-[var(--BeaconVie-danger)]">KhÃ´ng thá»ƒ má»Ÿ cÃ¢u láº¡c bá»™</h2>
        <p className="mt-2 text-sm text-[var(--BeaconVie-danger)]">{error}</p>
      </div>
    );
  }

  const activeClub = club;

  function renderTab() {
    switch (tab) {
      case "OVERVIEW":
        return <CommunityClubOverview club={activeClub} onChangeTab={setTab} />;

      case "POSTS":
        return (
          <CommunityClubPosts
            clubId={activeClub.id}
            canPost={activeClub.joined}
          />
        );

      case "CHAT":
        return activeClub.joined ? (
          <CommunityClubChat clubId={activeClub.id} />
        ) : (
          <JoinRequiredPanel
            title="Chat nhÃ³m chá»‰ dÃ nh cho thÃ nh viÃªn"
            description="Tham gia cÃ¢u láº¡c bá»™ Ä‘á»ƒ trÃ² chuyá»‡n realtime vá»›i cÃ¡c thÃ nh viÃªn khÃ¡c."
            onJoin={toggleJoin}
          />
        );

      case "MEMBERS":
        return (
          <CommunityClubMembers
            clubId={activeClub.id}
            myRole={activeClub.myRole}
          />
        );

      case "CHALLENGES":
        return (
          <CommunityClubChallenges
            clubId={activeClub.id}
            canManage={["OWNER", "ADMIN", "MODERATOR"].includes(
              activeClub.myRole ?? "",
            )}
            joined={activeClub.joined}
          />
        );

      case "EVENTS":
        return (
          <CommunityClubEvents
            clubId={activeClub.id}
            canManage={["OWNER", "ADMIN", "MODERATOR"].includes(
              activeClub.myRole ?? "",
            )}
            joined={activeClub.joined}
          />
        );

      case "RESOURCES":
        return (
          <CommunityClubResources
            clubId={activeClub.id}
            canUpload={activeClub.joined}
          />
        );

      case "MANAGEMENT":
        return canManageClub ? (
          <CommunityClubManagement
            clubId={activeClub.id}
            onDeleted={() => router.push("/community")}
          />
        ) : (
          <div className="rounded-3xl border-2 border-[var(--BeaconVie-danger)]/30 bg-[var(--BeaconVie-danger-soft)] px-6 py-12 text-center">
            <h3 className="font-extrabold text-[var(--BeaconVie-danger)]">
              Báº¡n khÃ´ng cÃ³ quyá»n quáº£n lÃ½ cÃ¢u láº¡c bá»™
            </h3>
          </div>
        );
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border-2 border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] shadow-md">
        <div className="relative h-52 bg-gradient-to-br from-indigo-600 to-violet-700">
          {club.coverUrl && (
            <img
              src={resolveMediaUrl(club.coverUrl)}
              alt={`áº¢nh bÃ¬a ${club.name}`}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className="h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
        </div>

        <div className="relative p-6">
          <div className="-mt-16 flex flex-wrap items-end gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-indigo-100 text-indigo-700 shadow-lg">
              {club.iconUrl ? (
                <img
                  src={resolveMediaUrl(club.iconUrl)}
                  alt={`Biá»ƒu tÆ°á»£ng ${club.name}`}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Users size={40} />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl font-extrabold text-slate-950">
                {club.name}
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                <span>{club.memberCount} thÃ nh viÃªn</span>
                <span>{club.postCount} bÃ i viáº¿t</span>
                <span>
                  {club.privacy === "PUBLIC"
                    ? "CÃ¢u láº¡c bá»™ cÃ´ng khai"
                    : "CÃ¢u láº¡c bá»™ riÃªng tÆ°"}
                </span>

                {club.myRole && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--BeaconVie-primary-soft)] px-2.5 py-1 text-xs text-[var(--BeaconVie-primary)]">
                    <ShieldCheck size={13} />
                    {club.myRole}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (club.myRole === "OWNER") {
                  setTab("MANAGEMENT");
                  return;
                }

                void toggleJoin();
              }}
              disabled={joinLoading}
              className={`rounded-xl px-5 py-3 font-extrabold transition disabled:opacity-50 ${
                club.joined
                  ? "border-2 border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] text-[var(--BeaconVie-ink)] hover:bg-[var(--BeaconVie-hover-tint)]"
                  : "bg-[var(--BeaconVie-primary)] text-white hover:brightness-110"
              }`}
            >
              {joinLoading
                ? "Äang xá»­ lÃ½..."
                : club.myRole === "OWNER"
                  ? "Quáº£n lÃ½ cÃ¢u láº¡c bá»™"
                  : club.joined
                    ? "Rá»i cÃ¢u láº¡c bá»™"
                    : club.privacy === "PRIVATE"
                      ? "Xin gia nháº­p"
                      : "Tham gia cÃ¢u láº¡c bá»™"}
            </button>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700">
            {club.description || "CÃ¢u láº¡c bá»™ chÆ°a cÃ³ mÃ´ táº£."}
          </p>

          {club.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {club.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--BeaconVie-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--BeaconVie-primary)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border-2 border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] p-2 shadow-sm">
        {tabs.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === item.key
                  ? "bg-[var(--BeaconVie-primary)] text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {renderTab()}
    </div>
  );
}

function JoinRequiredPanel({
  title,
  description,
  onJoin,
}: {
  title: string;
  description: string;
  onJoin: () => Promise<void>;
}) {
  return (
    <div className="rounded-3xl border-2 border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card)] px-6 py-14 text-center shadow-sm">
      <Users size={34} className="mx-auto text-[var(--BeaconVie-primary)]" />
      <h3 className="mt-4 text-lg font-extrabold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <button
        type="button"
        onClick={() => void onJoin()}
        className="mt-5 rounded-xl bg-[var(--BeaconVie-primary)] px-5 py-3 font-bold text-white"
      >
        Tham gia cÃ¢u láº¡c bá»™
      </button>
    </div>
  );
}
