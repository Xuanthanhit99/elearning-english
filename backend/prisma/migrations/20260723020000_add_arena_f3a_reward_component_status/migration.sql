-- Phase F3A: additive per-component season reward status for safe partial retry evidence.
ALTER TABLE "ArenaSeasonResult"
ADD COLUMN "rewardXpStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rewardGoldStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rewardArenaPointStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rewardNotificationStatus" TEXT NOT NULL DEFAULT 'PENDING';

UPDATE "ArenaSeasonResult"
SET
  "rewardXpStatus" = CASE
    WHEN "rewardStatus" = 'GRANTED' THEN 'GRANTED'
    WHEN "rewardStatus" = 'NONE' THEN 'SKIPPED'
    WHEN "rewardStatus" = 'FAILED' THEN 'FAILED'
    ELSE "rewardXpStatus"
  END,
  "rewardGoldStatus" = CASE
    WHEN "rewardStatus" = 'GRANTED' THEN 'GRANTED'
    WHEN "rewardStatus" = 'NONE' THEN 'SKIPPED'
    WHEN "rewardStatus" = 'FAILED' THEN 'FAILED'
    ELSE "rewardGoldStatus"
  END,
  "rewardArenaPointStatus" = CASE
    WHEN "rewardStatus" = 'GRANTED' THEN 'GRANTED'
    WHEN "rewardStatus" = 'NONE' THEN 'SKIPPED'
    WHEN "rewardStatus" = 'FAILED' THEN 'FAILED'
    ELSE "rewardArenaPointStatus"
  END,
  "rewardNotificationStatus" = CASE
    WHEN "rewardStatus" = 'GRANTED' THEN 'SKIPPED'
    WHEN "rewardStatus" = 'NONE' THEN 'SKIPPED'
    WHEN "rewardStatus" = 'FAILED' THEN 'PENDING'
    ELSE "rewardNotificationStatus"
  END;

CREATE INDEX "ArenaSeasonResult_rewardXpStatus_idx" ON "ArenaSeasonResult"("rewardXpStatus");
CREATE INDEX "ArenaSeasonResult_rewardGoldStatus_idx" ON "ArenaSeasonResult"("rewardGoldStatus");
CREATE INDEX "ArenaSeasonResult_rewardArenaPointStatus_idx" ON "ArenaSeasonResult"("rewardArenaPointStatus");
