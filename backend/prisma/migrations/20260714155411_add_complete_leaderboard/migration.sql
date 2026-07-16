-- CreateEnum
CREATE TYPE "LeaderboardPeriodType" AS ENUM ('WEEKLY', 'MONTHLY', 'SEASON', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "LeaderboardScopeType" AS ENUM ('GLOBAL', 'FRIENDS', 'CLUB', 'SKILL');

-- CreateEnum
CREATE TYPE "LeaderboardSeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'CALCULATING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeagueTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND');

-- CreateEnum
CREATE TYPE "LeaderboardZone" AS ENUM ('PROMOTION', 'SAFE', 'RELEGATION');

-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('VOCABULARY', 'SPEAKING', 'WRITING', 'LISTENING', 'READING', 'GRAMMAR', 'LESSON', 'QUIZ', 'MISSION', 'STREAK', 'PLACEMENT', 'COMMUNITY', 'CLUB_EVENT', 'REALTIME_ROOM', 'ARENA', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LeaderboardRewardStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "UserXpProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "currentLeague" "LeagueTier" NOT NULL DEFAULT 'BRONZE',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "showOnline" BOOLEAN NOT NULL DEFAULT true,
    "showStreak" BOOLEAN NOT NULL DEFAULT true,
    "useNickname" BOOLEAN NOT NULL DEFAULT false,
    "leaderboardName" TEXT,
    "lastXpEarnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserXpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpProfileId" TEXT NOT NULL,
    "sourceType" "XpSourceType" NOT NULL,
    "sourceId" TEXT,
    "skill" "LearningSkill",
    "baseXp" INTEGER NOT NULL,
    "bonusXp" INTEGER NOT NULL DEFAULT 0,
    "finalXp" INTEGER NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSeason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "LeaderboardPeriodType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "LeaderboardSeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardGroup" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "scope" "LeaderboardScopeType" NOT NULL DEFAULT 'GLOBAL',
    "league" "LeagueTier" NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 30,
    "clubId" TEXT,
    "skill" "LearningSkill",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpProfileId" TEXT NOT NULL,
    "periodXp" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "previousRank" INTEGER,
    "zone" "LeaderboardZone" NOT NULL DEFAULT 'SAFE',
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "relegated" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastXpAt" TIMESTAMP(3),

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardReward" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "league" "LeagueTier",
    "minRank" INTEGER NOT NULL,
    "maxRank" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLeaderboardReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpProfileId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "seasonId" TEXT,
    "status" "LeaderboardRewardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "UserLeaderboardReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpProfileId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "league" "LeagueTier" NOT NULL,
    "finalRank" INTEGER NOT NULL,
    "periodXp" INTEGER NOT NULL,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "relegated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserXpProfile_userId_key" ON "UserXpProfile"("userId");

-- CreateIndex
CREATE INDEX "UserXpProfile_totalXp_idx" ON "UserXpProfile"("totalXp");

-- CreateIndex
CREATE INDEX "UserXpProfile_currentLeague_idx" ON "UserXpProfile"("currentLeague");

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_idempotencyKey_key" ON "XpTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "XpTransaction_userId_earnedAt_idx" ON "XpTransaction"("userId", "earnedAt");

-- CreateIndex
CREATE INDEX "XpTransaction_sourceType_sourceId_idx" ON "XpTransaction"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "XpTransaction_skill_earnedAt_idx" ON "XpTransaction"("skill", "earnedAt");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_isActive_startsAt_endsAt_idx" ON "LeaderboardSeason"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "LeaderboardSeason_periodType_status_idx" ON "LeaderboardSeason"("periodType", "status");

-- CreateIndex
CREATE INDEX "LeaderboardGroup_seasonId_league_idx" ON "LeaderboardGroup"("seasonId", "league");

-- CreateIndex
CREATE INDEX "LeaderboardGroup_clubId_idx" ON "LeaderboardGroup"("clubId");

-- CreateIndex
CREATE INDEX "LeaderboardGroup_skill_idx" ON "LeaderboardGroup"("skill");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardGroup_seasonId_scope_league_groupNumber_clubId_s_key" ON "LeaderboardGroup"("seasonId", "scope", "league", "groupNumber", "clubId", "skill");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_groupId_periodXp_idx" ON "LeaderboardEntry"("groupId", "periodXp");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_groupId_userId_key" ON "LeaderboardEntry"("groupId", "userId");

-- CreateIndex
CREATE INDEX "UserLeaderboardReward_userId_status_idx" ON "UserLeaderboardReward"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserLeaderboardReward_userId_rewardId_seasonId_key" ON "UserLeaderboardReward"("userId", "rewardId", "seasonId");

-- CreateIndex
CREATE INDEX "LeaderboardHistory_userId_createdAt_idx" ON "LeaderboardHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardHistory_userId_seasonId_key" ON "LeaderboardHistory"("userId", "seasonId");

-- AddForeignKey
ALTER TABLE "UserXpProfile" ADD CONSTRAINT "UserXpProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_xpProfileId_fkey" FOREIGN KEY ("xpProfileId") REFERENCES "UserXpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardGroup" ADD CONSTRAINT "LeaderboardGroup_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LeaderboardGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_xpProfileId_fkey" FOREIGN KEY ("xpProfileId") REFERENCES "UserXpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardReward" ADD CONSTRAINT "LeaderboardReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeaderboardReward" ADD CONSTRAINT "UserLeaderboardReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeaderboardReward" ADD CONSTRAINT "UserLeaderboardReward_xpProfileId_fkey" FOREIGN KEY ("xpProfileId") REFERENCES "UserXpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeaderboardReward" ADD CONSTRAINT "UserLeaderboardReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LeaderboardReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLeaderboardReward" ADD CONSTRAINT "UserLeaderboardReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardHistory" ADD CONSTRAINT "LeaderboardHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardHistory" ADD CONSTRAINT "LeaderboardHistory_xpProfileId_fkey" FOREIGN KEY ("xpProfileId") REFERENCES "UserXpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardHistory" ADD CONSTRAINT "LeaderboardHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeaderboardSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
