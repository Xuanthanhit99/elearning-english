"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Award,
  CalendarDays,
  ChevronRight,
  Crown,
  Flame,
  Medal,
  RefreshCcw,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type {
  LeaderboardTab,
  LeaderboardEntry,
  LeaderboardResponse,
} from "@/src/types/leaderboard";
import {
  getClubLeaderboard,
  getFriendsLeaderboard,
  getMonthlyLeaderboard,
  getMyLeaderboardClubs,
  getSkillLeaderboard,
  getWeeklyLeaderboard,
} from "@/src/lib/leaderboard-api";

const tabs: Array<{ key: LeaderboardTab; label: string; icon: any }> = [
  { key: "weekly", label: "Tuáº§n", icon: Trophy },
  { key: "monthly", label: "ThÃ¡ng", icon: CalendarDays },
  { key: "friends", label: "Báº¡n bÃ¨", icon: Users },
  { key: "club", label: "Club", icon: Shield },
  { key: "skill", label: "Ká»¹ nÄƒng", icon: Sparkles },
];

const skills = [
  "SPEAKING",
  "WRITING",
  "VOCABULARY",
  "LISTENING",
  "READING",
  "GRAMMAR",
];

function nameOf(entry: LeaderboardEntry) {
  return entry.user?.displayName ?? entry.user?.fullname ?? "NgÆ°á»i há»c";
}

function avatarOf(entry: LeaderboardEntry) {
  return entry.user?.avatarUrl ?? entry.user?.avatar ?? null;
}

function timeRemaining(end?: string | null) {
  if (!end) return "ChÆ°a cÃ³ mÃ¹a Ä‘ang hoáº¡t Ä‘á»™ng";
  const ms = Math.max(0, new Date(end).getTime() - Date.now());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return `${days} ngÃ y ${hours} giá»`;
}

export default function LeaderboardPage({
  initialClubId,
}: {
  initialClubId?: string;
}) {
  const [tab, setTab] = useState<LeaderboardTab>("weekly");
  const [skill, setSkill] = useState("SPEAKING");
  const [clubId, setClubId] = useState(initialClubId ?? "");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clubs, setClubs] = useState<
    Array<{
      id: string;
      name: string;
      iconUrl?: string | null;
      memberCount: number;
    }>
  >([]);

  useEffect(() => {
    getMyLeaderboardClubs()
      .then((result) => {
        setClubs(result);

        if (!clubId && result.length > 0) {
          setClubId(result[0].id);
        }
      })
      .catch(() => {
        setClubs([]);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result =
        tab === "weekly"
          ? await getWeeklyLeaderboard()
          : tab === "monthly"
            ? await getMonthlyLeaderboard()
            : tab === "friends"
              ? await getFriendsLeaderboard()
              : tab === "club"
                ? clubId
                  ? await getClubLeaderboard(clubId)
                  : {
                      period: null,
                      currentUser: null,
                      entries: [],
                      message: "Chá»n má»™t Club Ä‘á»ƒ xem báº£ng xáº¿p háº¡ng.",
                    }
                : await getSkillLeaderboard(skill);
      setData(result as LeaderboardResponse);
    } catch (e: any) {
      console.log("e", e);
      setError(e?.response?.data?.message ?? "KhÃ´ng thá»ƒ táº£i báº£ng xáº¿p háº¡ng.");
    } finally {
      setLoading(false);
    }
  }, [tab, skill, clubId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data?.groupId) return;
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_API_URL}/leaderboard`,
      {
        withCredentials: true,
        transports: ["websocket"],
      },
    );
    socket.emit("leaderboard:join", { groupId: data.groupId });
    socket.on("leaderboard:updated", load);
    return () => {
      socket.emit("leaderboard:leave", { groupId: data.groupId });
      socket.disconnect();
    };
  }, [data?.groupId, load]);

  const topThree = useMemo(() => data?.entries.slice(0, 3) ?? [], [data]);
  const rest = useMemo(() => data?.entries.slice(3) ?? [], [data]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-violet-100">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  BeaconVie League
                </span>
              </div>
              <h1 className="text-3xl font-black sm:text-4xl">Báº£ng xáº¿p háº¡ng</h1>
              <p className="mt-2 max-w-2xl text-sm text-violet-100 sm:text-base">
                Thi Ä‘ua lÃ nh máº¡nh, duy trÃ¬ thÃ³i quen vÃ  tiáº¿n bá»™ tá»«ng ngÃ y.
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur">
              <p className="text-sm text-violet-100">Káº¿t thÃºc sau</p>
              <p className="mt-1 text-xl font-bold">
                {timeRemaining(data?.period?.endsAt)}
              </p>
            </div>
          </div>
        </header>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                tab === key
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "skill" && (
          <div className="mb-5 flex gap-2 overflow-x-auto">
            {skills.map((item) => (
              <button
                key={item}
                onClick={() => setSkill(item)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  skill === item
                    ? "border-violet-600 bg-violet-50 text-violet-700"
                    : "bg-white text-slate-600"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {tab === "club" && (
          <div className="mb-5">
            {clubs.length > 0 ? (
              <select
                value={clubId}
                onChange={(event) => setClubId(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} Â· {club.memberCount} thÃ nh viÃªn
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border bg-white p-5 text-center">
                Báº¡n chÆ°a tham gia cÃ¢u láº¡c bá»™ nÃ o.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <span>{error}</span>
            <button onClick={load} aria-label="Thử lại">
              <RefreshCcw aria-hidden className="h-5 w-5" />
            </button>
          </div>
        )}

        {loading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="space-y-5">
              {data?.message && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  {data.message}
                </div>
              )}

              <Podium entries={topThree} />

              <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
                <div className="border-b px-4 py-4 sm:px-6">
                  <h2 className="font-extrabold text-slate-900">
                    Thá»© háº¡ng hiá»‡n táº¡i
                  </h2>
                </div>
                <div>
                  {rest.map((entry) => (
                    <RankRow
                      key={`${entry.rank}-${entry.user?.id}`}
                      entry={entry}
                    />
                  ))}
                  {!data?.entries.length && (
                    <div className="p-10 text-center text-slate-500">
                      ChÆ°a cÃ³ dá»¯ liá»‡u xáº¿p háº¡ng.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <MyRankCard data={data} />
              <LeagueInfo data={data} />
              <RewardPreview />
            </aside>
          </div>
        )}
      </div>

      {data?.currentUser && (
        <div className="fixed inset-x-3 bottom-3 z-20 rounded-2xl border bg-white p-3 shadow-2xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Vá»‹ trÃ­ cá»§a báº¡n
              </p>
              <p className="font-black text-slate-900">
                #
                {"rank" in data.currentUser
                  ? (data.currentUser.rank ?? "â€”")
                  : "â€”"}{" "}
                Â·{" "}
                {"periodXp" in data.currentUser ? data.currentUser.periodXp : 0}{" "}
                XP
              </p>
            </div>
            <a
              href="/learn"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
            >
              Há»c tiáº¿p
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) return null;
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <div className="grid grid-cols-3 items-end gap-2 rounded-3xl border bg-white p-4 shadow-sm sm:gap-4 sm:p-6">
      {order.map((entry, index) => {
        const isFirst = entry.rank === 1;
        return (
          <div key={entry.rank} className="text-center">
            <div className="relative mx-auto mb-3 h-16 w-16 sm:h-20 sm:w-20">
              <Avatar entry={entry} />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                #{entry.rank}
              </span>
              {isFirst && (
                <Crown className="absolute -top-6 left-1/2 h-7 w-7 -translate-x-1/2 text-amber-500" />
              )}
            </div>
            <p className="truncate text-sm font-extrabold text-slate-900">
              {nameOf(entry)}
            </p>
            <p className="mt-1 text-xs font-bold text-violet-600 sm:text-sm">
              {entry.periodXp.toLocaleString()} XP
            </p>
            <div
              className={`mt-3 rounded-t-2xl ${isFirst ? "h-24 bg-amber-100" : "h-16 bg-slate-100"} flex items-center justify-center`}
            >
              <Medal
                className={isFirst ? "text-amber-500" : "text-slate-400"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-4 last:border-0 sm:px-6">
      <div className="w-9 text-center text-lg font-black text-slate-500">
        #{entry.rank}
      </div>
      <div className="h-11 w-11 shrink-0">
        <Avatar entry={entry} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900">{nameOf(entry)}</p>
        <p className="text-xs text-slate-500">
          Level {entry.user?.level ?? 1}
          {entry.user?.streak ? ` Â· ðŸ”¥ ${entry.user.streak}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="font-black text-violet-700">
          {entry.periodXp.toLocaleString()} XP
        </p>
        <p
          className={`text-xs font-semibold ${
            entry.zone === "PROMOTION"
              ? "text-emerald-600"
              : entry.zone === "RELEGATION"
                ? "text-red-500"
                : "text-slate-400"
          }`}
        >
          {entry.zone === "PROMOTION"
            ? "ThÄƒng háº¡ng"
            : entry.zone === "RELEGATION"
              ? "Nguy hiá»ƒm"
              : "An toÃ n"}
        </p>
      </div>
    </div>
  );
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const avatar = avatarOf(entry);
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={nameOf(entry)}
        className="h-full w-full rounded-full object-cover ring-4 ring-white shadow"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-black text-white ring-4 ring-white shadow">
      {nameOf(entry).slice(0, 1).toUpperCase()}
    </div>
  );
}

function MyRankCard({ data }: { data: LeaderboardResponse | null }) {
  const me: any = data?.currentUser;
  return (
    <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-xl">
      <p className="text-sm font-semibold text-slate-300">Vá»‹ trÃ­ cá»§a báº¡n</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-4xl font-black">#{me?.rank ?? "â€”"}</p>
          <p className="mt-1 text-sm text-slate-300">
            {me?.periodXp?.toLocaleString?.() ?? 0} XP tuáº§n nÃ y
          </p>
        </div>
        <Trophy className="h-10 w-10 text-amber-400" />
      </div>
      <div className="mt-5 rounded-2xl bg-white/10 p-3">
        <p className="text-xs text-slate-300">Cáº§n Ä‘á»ƒ vÆ°á»£t ngÆ°á»i phÃ­a trÃªn</p>
        <p className="mt-1 font-bold">{me?.xpToNextRank ?? 0} XP</p>
      </div>
      <a
        href="/learn"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-bold"
      >
        Tiáº¿p tá»¥c há»c <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function LeagueInfo({ data }: { data: LeaderboardResponse | null }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-amber-100 p-3">
          <Shield className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            League hiá»‡n táº¡i
          </p>
          <p className="text-xl font-black text-slate-900">
            {data?.league ?? "ChÆ°a xáº¿p háº¡ng"}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-emerald-600">
            Top {data?.config?.promotionCount ?? 5}
          </span>
          <span>ThÄƒng háº¡ng</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Khu vá»±c giá»¯a</span>
          <span>Giá»¯ háº¡ng</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-500">NhÃ³m cuá»‘i</span>
          <span>Xuá»‘ng háº¡ng</span>
        </div>
      </div>
    </div>
  );
}

function RewardPreview() {
  return (
    <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
      <div className="flex items-center gap-2 font-black text-violet-900">
        <Award className="h-5 w-5" /> Pháº§n thÆ°á»Ÿng tuáº§n
      </div>
      <p className="mt-2 text-sm text-violet-700">
        Top 10 nháº­n XP, xu vÃ  huy hiá»‡u theo thá»© háº¡ng.
      </p>
      <a
        href="/leaderboard/rewards"
        className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-700"
      >
        Xem pháº§n thÆ°á»Ÿng <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
    </div>
  );
}
