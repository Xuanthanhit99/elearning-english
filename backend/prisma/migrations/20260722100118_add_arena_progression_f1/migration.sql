-- CreateEnum
CREATE TYPE "ArenaTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND');

-- CreateEnum
CREATE TYPE "ArenaSeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CALCULATING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArenaProgressionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "ArenaProfile" ADD COLUMN     "seasonLoseCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seasonWinCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tier" "ArenaTier" NOT NULL DEFAULT 'BRONZE';

-- AlterTable
ALTER TABLE "ArenaRoom" ADD COLUMN     "contextId" TEXT,
ADD COLUMN     "contextType" TEXT;

-- CreateTable
CREATE TABLE "ArenaSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ArenaSeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaRatingHistory" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT,
    "previousMmr" INTEGER NOT NULL,
    "nextMmr" INTEGER NOT NULL,
    "mmrDelta" INTEGER NOT NULL,
    "previousTier" "ArenaTier" NOT NULL,
    "nextTier" "ArenaTier" NOT NULL,
    "opponentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaRatingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaProgressionRecord" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT,
    "status" "ArenaProgressionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "xpTransactionId" TEXT,
    "ratingHistoryId" TEXT,
    "rewardLogId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaProgressionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArenaSeason_isActive_startsAt_endsAt_idx" ON "ArenaSeason"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ArenaSeason_status_idx" ON "ArenaSeason"("status");

-- CreateIndex
CREATE INDEX "ArenaRatingHistory_userId_createdAt_idx" ON "ArenaRatingHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ArenaRatingHistory_seasonId_idx" ON "ArenaRatingHistory"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaRatingHistory_matchId_userId_key" ON "ArenaRatingHistory"("matchId", "userId");

-- CreateIndex
CREATE INDEX "ArenaProgressionRecord_status_leaseExpiresAt_idx" ON "ArenaProgressionRecord"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "ArenaProgressionRecord_userId_idx" ON "ArenaProgressionRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaProgressionRecord_matchId_userId_key" ON "ArenaProgressionRecord"("matchId", "userId");

-- CreateIndex
CREATE INDEX "ArenaRoom_contextType_contextId_idx" ON "ArenaRoom"("contextType", "contextId");

-- AddForeignKey
ALTER TABLE "ArenaRatingHistory" ADD CONSTRAINT "ArenaRatingHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaRatingHistory" ADD CONSTRAINT "ArenaRatingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaRatingHistory" ADD CONSTRAINT "ArenaRatingHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ArenaSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaProgressionRecord" ADD CONSTRAINT "ArenaProgressionRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaProgressionRecord" ADD CONSTRAINT "ArenaProgressionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaProgressionRecord" ADD CONSTRAINT "ArenaProgressionRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "ArenaSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
