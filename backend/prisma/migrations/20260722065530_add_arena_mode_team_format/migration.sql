-- Phase BC-Reconciliation: ArenaMode/ArenaTeamFormat architecture + question
-- pipeline support (content hash, per-user question history) + room
-- preparation state machine (PREPARING/FAILED statuses).
--
-- Pre-migration audit (run manually before applying, see report): as of
-- writing, `ArenaRoom` has exactly 1 row in the dev database (gameMode
-- 'SOLO_1V1', real user-created room, not test data — left untouched by this
-- migration's backfill, which maps it to mode=RANKED/teamFormat=SOLO_1V1).
-- No ArenaQuestion rows exist with duplicate (matchId, contentHash) since
-- contentHash is being introduced fresh as NULL for all existing rows —
-- Postgres unique constraints do not conflict on NULL, so the new unique
-- index applies cleanly with zero existing data risk.

-- CreateEnum
CREATE TYPE "ArenaMode" AS ENUM ('RANKED', 'AI_PRACTICE', 'SURVIVAL', 'BLITZ', 'FRIEND_CHALLENGE', 'TOURNAMENT_LEGACY');

-- CreateEnum
CREATE TYPE "ArenaTeamFormat" AS ENUM ('SOLO', 'SOLO_1V1', 'TEAM_2V2', 'TEAM_3V3');

-- AlterEnum: new ArenaRoomStatus values for the preparation state machine.
ALTER TYPE "ArenaRoomStatus" ADD VALUE 'PREPARING';
ALTER TYPE "ArenaRoomStatus" ADD VALUE 'FAILED';

-- AlterTable: ArenaRoom canonical mode/team-format (nullable — legacy rows
-- resolve via resolveArenaMode()'s gameMode mapping at the application layer,
-- no NOT NULL step in this migration) + preparation bookkeeping.
ALTER TABLE "ArenaRoom" ADD COLUMN "mode" "ArenaMode",
ADD COLUMN "teamFormat" "ArenaTeamFormat",
ADD COLUMN "preparationError" TEXT,
ADD COLUMN "preparationStartedAt" TIMESTAMP(3);

-- AlterTable: ArenaQuestion content hash for dedup.
ALTER TABLE "ArenaQuestion" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ArenaQuestion_matchId_contentHash_key" ON "ArenaQuestion"("matchId", "contentHash");

-- CreateTable
CREATE TABLE "ArenaUserQuestionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "mode" TEXT,
    "skill" TEXT NOT NULL,
    "topic" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaUserQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArenaUserQuestionHistory_userId_seenAt_idx" ON "ArenaUserQuestionHistory"("userId", "seenAt");

-- AddForeignKey
ALTER TABLE "ArenaUserQuestionHistory" ADD CONSTRAINT "ArenaUserQuestionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaUserQuestionHistory" ADD CONSTRAINT "ArenaUserQuestionHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: legacy gameMode -> canonical mode/teamFormat. `SOLO_1V1` /
-- `TEAM_2V2` / `TEAM_3V3` were the only gameplay-live modes (finalizeMatch
-- has always unconditionally applied ELO) -> RANKED with the matching team
-- format. Legacy `TOURNAMENT` rows (1-vs-64 capacity, never fit the new
-- SOLO/SOLO_1V1/TEAM_2V2/TEAM_3V3 capacity model) -> TOURNAMENT_LEGACY,
-- tagged SOLO team format for introspection only; TOURNAMENT_LEGACY stays on
-- its pre-existing MODE_SIZE-driven capacity path at the application layer,
-- unaffected by the new capacity registry, and new TOURNAMENT room creation
-- is rejected going forward (registry: disabled for new matchmaking). Any
-- other/unrecognized legacy value is left NULL rather than guessed at.
UPDATE "ArenaRoom" SET "mode" = 'RANKED', "teamFormat" = 'SOLO_1V1' WHERE "gameMode" = 'SOLO_1V1';
UPDATE "ArenaRoom" SET "mode" = 'RANKED', "teamFormat" = 'TEAM_2V2' WHERE "gameMode" = 'TEAM_2V2';
UPDATE "ArenaRoom" SET "mode" = 'RANKED', "teamFormat" = 'TEAM_3V3' WHERE "gameMode" = 'TEAM_3V3';
UPDATE "ArenaRoom" SET "mode" = 'TOURNAMENT_LEGACY', "teamFormat" = 'SOLO' WHERE "gameMode" = 'TOURNAMENT';
