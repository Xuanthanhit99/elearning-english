-- AlterTable
ALTER TABLE "ArenaProfile" ADD COLUMN     "lastRatingDecayAt" TIMESTAMP(3),
ADD COLUMN     "peakMmr" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "peakTier" "ArenaTier" NOT NULL DEFAULT 'BRONZE';

-- Backfill lifetime peak from the existing authoritative match rating log.
-- Decay is intentionally excluded from ArenaRatingHistory, so this remains
-- the correct source for historical match-driven peaks.
WITH user_peaks AS (
  SELECT
    p."userId",
    GREATEST(p."peakMmr", p."mmr", COALESCE(MAX(h."nextMmr"), p."mmr")) AS "peakMmr"
  FROM "ArenaProfile" p
  LEFT JOIN "ArenaRatingHistory" h ON h."userId" = p."userId"
  GROUP BY p."userId", p."peakMmr", p."mmr"
),
resolved AS (
  SELECT
    "userId",
    "peakMmr",
    CASE
      WHEN "peakMmr" >= 2200 THEN 'LEGEND'::"ArenaTier"
      WHEN "peakMmr" >= 2000 THEN 'MASTER'::"ArenaTier"
      WHEN "peakMmr" >= 1800 THEN 'DIAMOND'::"ArenaTier"
      WHEN "peakMmr" >= 1600 THEN 'PLATINUM'::"ArenaTier"
      WHEN "peakMmr" >= 1400 THEN 'GOLD'::"ArenaTier"
      WHEN "peakMmr" >= 1200 THEN 'SILVER'::"ArenaTier"
      ELSE 'BRONZE'::"ArenaTier"
    END AS "peakTier"
  FROM user_peaks
)
UPDATE "ArenaProfile" p
SET
  "peakMmr" = resolved."peakMmr",
  "peakTier" = resolved."peakTier"
FROM resolved
WHERE p."userId" = resolved."userId";
