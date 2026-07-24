"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Trophy, X } from "lucide-react";
import type { DashboardData } from "@/src/lib/dashboard-api";

const ACHIEVEMENT_SEEN_KEY = "beaconvie:achievements:lastSeenAt";
const LEVEL_SEEN_KEY = "beaconvie:level:lastSeen";

type CelebrationState =
  | { kind: "achievement"; title: string; xp: number; coins: number }
  | { kind: "level-up"; level: number }
  | null;

function fireConfetti() {
  // canvas-confetti and framer-motion were both already installed dependencies
  // with zero real usage anywhere in the app (per the achievement-production
  // audit) — reused here rather than hand-rolling another bespoke CSS confetti
  // effect like the two pre-existing, non-reusable ones in Listening/Vocabulary.
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.3 },
    zIndex: 9999,
  });
}

/**
 * Client-only "new achievement" / "level up" celebration. Deliberately
 * requires no backend schema change: it diffs the Dashboard's existing
 * `recentAchievements`/level data against a localStorage-tracked "last seen"
 * marker, so only genuinely-new-since-last-visit events celebrate — not
 * every achievement the user has ever earned on first-ever page load.
 */
export function AchievementCelebration({ data }: { data: DashboardData | null }) {
  const [celebration, setCelebration] = useState<CelebrationState>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!data || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      checkAchievements(data, setCelebration);
      checkLevelUp(data, setCelebration);
    } catch {
      // localStorage can throw in some privacy modes — celebration is
      // cosmetic, never worth breaking the dashboard over.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!celebration) return;
    fireConfetti();
    const timer = window.setTimeout(() => setCelebration(null), 5000);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed left-1/2 top-6 z-[9998] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 rounded-3xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card)] p-4 shadow-[0_24px_70px_rgba(31,42,68,0.18)] dark:shadow-black/40">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--lumiverse-primary)] to-[var(--lumiverse-violet)] text-white">
              {celebration.kind === "level-up" ? (
                <Sparkles aria-hidden className="h-5 w-5" />
              ) : (
                <Trophy aria-hidden className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {celebration.kind === "level-up" ? (
                <>
                  <p className="font-black text-[var(--lumiverse-ink)]">Level Up!</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--lumiverse-muted)]">
                    You&apos;ve reached level {celebration.level}. Keep it up!
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-[var(--lumiverse-ink)]">
                    Achievement unlocked!
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--lumiverse-muted)]">
                    {celebration.title}
                    {celebration.xp > 0 ? ` · +${celebration.xp} XP` : ""}
                    {celebration.coins > 0 ? ` · +${celebration.coins} coins` : ""}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setCelebration(null)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--lumiverse-muted)] transition hover:bg-[var(--lumiverse-card-soft)] hover:text-[var(--lumiverse-ink)]"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function checkAchievements(
  data: DashboardData,
  setCelebration: Dispatch<SetStateAction<CelebrationState>>,
) {
  const achievements = data.recentAchievements ?? [];
  if (achievements.length === 0) return;

  const lastSeenRaw = window.localStorage.getItem(ACHIEVEMENT_SEEN_KEY);
  const latest = achievements[0];
  const latestTime = new Date(latest.earnedAt).getTime();

  if (!lastSeenRaw) {
    // First-ever dashboard visit with achievement data — establish the
    // baseline silently instead of celebrating the user's entire history.
    window.localStorage.setItem(ACHIEVEMENT_SEEN_KEY, latest.earnedAt);
    return;
  }

  const lastSeenTime = new Date(lastSeenRaw).getTime();
  if (Number.isNaN(lastSeenTime) || latestTime <= lastSeenTime) return;

  window.localStorage.setItem(ACHIEVEMENT_SEEN_KEY, latest.earnedAt);
  setCelebration({
    kind: "achievement",
    title: latest.title,
    xp: latest.xp ?? 0,
    coins: latest.coins ?? 0,
  });
}

function checkLevelUp(
  data: DashboardData,
  setCelebration: Dispatch<SetStateAction<CelebrationState>>,
) {
  const currentLevel = data.xp?.level ?? data.user?.level;
  if (typeof currentLevel !== "number" || currentLevel <= 0) return;

  const lastSeenRaw = window.localStorage.getItem(LEVEL_SEEN_KEY);

  if (!lastSeenRaw) {
    window.localStorage.setItem(LEVEL_SEEN_KEY, String(currentLevel));
    return;
  }

  const lastLevel = Number(lastSeenRaw);
  if (Number.isNaN(lastLevel) || currentLevel <= lastLevel) return;

  window.localStorage.setItem(LEVEL_SEEN_KEY, String(currentLevel));
  // Achievement unlocks take visual priority if both happen on the same
  // load — level-up only celebrates when nothing else already claimed the
  // slot, since setCelebration below would otherwise overwrite it.
  setCelebration((current) => current ?? { kind: "level-up", level: currentLevel });
}
