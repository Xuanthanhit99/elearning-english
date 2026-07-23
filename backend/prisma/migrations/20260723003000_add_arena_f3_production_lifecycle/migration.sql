-- Phase F3 production lifecycle, additive-only.

ALTER TABLE "ArenaSeason"
  ADD COLUMN "seasonCode" TEXT,
  ADD COLUMN "seasonNumber" INTEGER,
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "closingStartedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "rewardsDistributedAt" TIMESTAMP(3),
  ADD COLUMN "resetAppliedAt" TIMESTAMP(3);

UPDATE "ArenaSeason"
SET
  "activatedAt" = COALESCE("activatedAt", CASE WHEN "isActive" = true OR "status" = 'ACTIVE' THEN "startsAt" ELSE NULL END),
  "seasonCode" = COALESCE("seasonCode", 'arena-' || to_char("startsAt", 'YYYYMMDDHH24MISS')),
  "seasonNumber" = COALESCE(
    "ArenaSeason"."seasonNumber",
    ranked."seasonNumber"
  )
FROM (
  SELECT id, row_number() OVER (ORDER BY "startsAt", id)::integer AS "seasonNumber"
  FROM "ArenaSeason"
) ranked
WHERE "ArenaSeason".id = ranked.id;

CREATE UNIQUE INDEX "ArenaSeason_seasonCode_key" ON "ArenaSeason"("seasonCode");
CREATE UNIQUE INDEX "ArenaSeason_seasonNumber_key" ON "ArenaSeason"("seasonNumber");

ALTER TABLE "ArenaMatch" ADD COLUMN "seasonId" TEXT;

UPDATE "ArenaMatch" m
SET "seasonId" = h."seasonId"
FROM (
  SELECT DISTINCT ON ("matchId") "matchId", "seasonId"
  FROM "ArenaRatingHistory"
  WHERE "seasonId" IS NOT NULL
  ORDER BY "matchId", "createdAt" ASC
) h
WHERE m.id = h."matchId" AND m."seasonId" IS NULL;

CREATE INDEX "ArenaMatch_seasonId_idx" ON "ArenaMatch"("seasonId");
ALTER TABLE "ArenaMatch"
  ADD CONSTRAINT "ArenaMatch_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "ArenaSeason"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ArenaSeasonResult" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "finalMmr" INTEGER NOT NULL,
  "finalTier" "ArenaTier" NOT NULL,
  "peakMmr" INTEGER NOT NULL,
  "peakTier" "ArenaTier" NOT NULL,
  "matches" INTEGER NOT NULL,
  "wins" INTEGER NOT NULL,
  "losses" INTEGER NOT NULL,
  "winRate" INTEGER NOT NULL,
  "finalRank" INTEGER,
  "rewardTier" TEXT NOT NULL,
  "rewardPayload" JSONB,
  "rewardStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "rewardGrantedAt" TIMESTAMP(3),
  "resetPreviousMmr" INTEGER,
  "resetNextMmr" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArenaSeasonResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaSeasonResult_seasonId_userId_key" ON "ArenaSeasonResult"("seasonId", "userId");
CREATE INDEX "ArenaSeasonResult_seasonId_finalRank_idx" ON "ArenaSeasonResult"("seasonId", "finalRank");
CREATE INDEX "ArenaSeasonResult_rewardStatus_idx" ON "ArenaSeasonResult"("rewardStatus");
ALTER TABLE "ArenaSeasonResult"
  ADD CONSTRAINT "ArenaSeasonResult_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "ArenaSeason"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArenaSeasonResult"
  ADD CONSTRAINT "ArenaSeasonResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ArenaFairPlayLog" (
  "id" TEXT NOT NULL,
  "matchId" TEXT,
  "userId" TEXT NOT NULL,
  "opponentId" TEXT,
  "seasonId" TEXT,
  "reason" TEXT NOT NULL,
  "ratingSuppressed" BOOLEAN NOT NULL DEFAULT false,
  "rewardSuppressed" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArenaFairPlayLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaFairPlayLog_matchId_userId_reason_key" ON "ArenaFairPlayLog"("matchId", "userId", "reason");
CREATE INDEX "ArenaFairPlayLog_userId_createdAt_idx" ON "ArenaFairPlayLog"("userId", "createdAt");
CREATE INDEX "ArenaFairPlayLog_seasonId_idx" ON "ArenaFairPlayLog"("seasonId");
ALTER TABLE "ArenaFairPlayLog"
  ADD CONSTRAINT "ArenaFairPlayLog_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArenaFairPlayLog"
  ADD CONSTRAINT "ArenaFairPlayLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
