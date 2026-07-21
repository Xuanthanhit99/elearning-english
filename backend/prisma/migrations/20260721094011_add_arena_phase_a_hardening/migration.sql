-- Phase A: Arena security & core hardening
-- 1. Server-side match deadline (used to reject/zero-score late answers).
--    Nullable so legacy matches created before this migration are treated as
--    having no deadline (never late) instead of breaking.
-- 2. Defense-in-depth uniqueness: at most one ArenaRewardLog row per
--    (matchId, userId), backing the idempotent finishMatch/finalizeMatch
--    logic in ArenaService.
-- No data migration/backfill needed: verified ArenaRewardLog had 0 rows and
-- no duplicate (matchId, userId) pairs at the time this migration was
-- written (checked via a read-only groupBy query against the dev database).

-- AlterTable
ALTER TABLE "ArenaMatch" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ArenaRewardLog_matchId_userId_key" ON "ArenaRewardLog"("matchId", "userId");
