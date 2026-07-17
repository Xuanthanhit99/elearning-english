'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getMyLeaderboardClubs } from '@/src/lib/leaderboard-api';
import { useLeaderboard } from '@/src/hooks/useLeaderboard';
import { useLeaderboardRealtime } from '@/src/hooks/useLeaderboardRealtime';
import type {
  ClubSummary,
  LeaderboardScope,
  WeeklyResultPayload,
} from '@/src/types/leaderboard';
import { ClubPicker } from './ClubPicker';
import { CurrentUserRankCard } from './CurrentUserRankCard';
import { LeaderboardEmpty, LeaderboardError, LeaderboardLoading } from './LeaderboardStates';
import { LeaderboardHeader } from './LeaderboardHeader';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardTable } from './LeaderboardTable';
import { LeaderboardTabs } from './LeaderboardTabs';
import { WeeklyResultModal } from './WeeklyResultModal';

export function LeaderboardPageClient() {
  const [scope, setScope] =
    useState<LeaderboardScope>('GLOBAL');
  const [clubs, setClubs] =
    useState<ClubSummary[]>([]);
  const [clubId, setClubId] =
    useState<string>();
  const [weeklyResult, setWeeklyResult] =
    useState<WeeklyResultPayload | null>(null);

  const leaderboard = useLeaderboard({
    scope,
    clubId,
  });

  useEffect(() => {
    void getMyLeaderboardClubs()
      .then((items) => {
        setClubs(items);
        setClubId((current) => current ?? items[0]?.id);
      })
      .catch(() => setClubs([]));
  }, []);

  const refetch = useCallback(() => {
    void leaderboard.refetch();
  }, [leaderboard.refetch]);

  useLeaderboardRealtime({
    groupId:
      leaderboard.data?.period?.groupId,
    onLeaderboardUpdated: refetch,
    onWeeklyResult: setWeeklyResult,
    onRewardAvailable: refetch,
    onSeasonStarted: refetch,
  });

  const visibleEntries = useMemo(
    () => leaderboard.data?.entries ?? [],
    [leaderboard.data?.entries],
  );

  return (
    <>
      <LeaderboardHeader
        period={leaderboard.data?.period ?? undefined}
      />

      <LeaderboardTabs
        value={scope}
        onChange={setScope}
      />

      {scope === 'CLUB' && (
        <ClubPicker
          clubs={clubs}
          value={clubId}
          onChange={setClubId}
        />
      )}

      {leaderboard.loading && (
        <LeaderboardLoading />
      )}

      {!leaderboard.loading &&
        leaderboard.error && (
          <LeaderboardError
            message={leaderboard.error}
            onRetry={() =>
              void leaderboard.refetch()
            }
          />
        )}

      {!leaderboard.loading &&
        !leaderboard.error &&
        visibleEntries.length === 0 && (
          <LeaderboardEmpty scope={scope} />
        )}

      {!leaderboard.loading &&
        !leaderboard.error &&
        visibleEntries.length > 0 && (
          <>
            <LeaderboardPodium
              entries={visibleEntries.slice(0, 3)}
            />

            <CurrentUserRankCard
              entry={
                leaderboard.data?.currentUser ??
                null
              }
            />

            <LeaderboardTable
              entries={visibleEntries}
            />
          </>
        )}

      <WeeklyResultModal
        result={weeklyResult}
        onClose={() => setWeeklyResult(null)}
      />
    </>
  );
}
