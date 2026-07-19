-- Achievement production schema for Phase 1.

ALTER TYPE "XpSourceType" ADD VALUE IF NOT EXISTS 'ACHIEVEMENT';

CREATE TYPE "AchievementCategory" AS ENUM (
  'LEARNING',
  'VOCABULARY',
  'GRAMMAR',
  'READING',
  'LISTENING',
  'SPEAKING',
  'WRITING',
  'PLACEMENT',
  'MISSION',
  'STREAK',
  'COMMUNITY',
  'LEADERBOARD',
  'PET',
  'ARENA',
  'SPECIAL'
);

CREATE TYPE "AchievementRarity" AS ENUM (
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY'
);

CREATE TYPE "AchievementVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

CREATE TYPE "AchievementStatus" AS ENUM (
  'LOCKED',
  'IN_PROGRESS',
  'UNLOCKED',
  'CLAIMABLE',
  'CLAIMED'
);

CREATE TYPE "AchievementRuleType" AS ENUM (
  'TOTAL_COUNT',
  'MAX_VALUE',
  'ONE_TIME_EVENT'
);

CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "imageUrl" TEXT,
  "category" "AchievementCategory" NOT NULL,
  "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON',
  "visibility" "AchievementVisibility" NOT NULL DEFAULT 'PUBLIC',
  "ruleType" "AchievementRuleType" NOT NULL,
  "eventType" TEXT NOT NULL,
  "ruleConfig" JSONB,
  "targetValue" INTEGER NOT NULL,
  "rewardXp" INTEGER NOT NULL DEFAULT 0,
  "rewardCoins" INTEGER NOT NULL DEFAULT 0,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "targetSnapshot" INTEGER NOT NULL,
  "status" "AchievementStatus" NOT NULL DEFAULT 'LOCKED',
  "unlockedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "lastEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AchievementProcessedEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AchievementProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AchievementRewardTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "userAchievementId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AchievementRewardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");
CREATE INDEX "Achievement_isActive_eventType_idx" ON "Achievement"("isActive", "eventType");
CREATE INDEX "Achievement_category_displayOrder_idx" ON "Achievement"("category", "displayOrder");

CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX "UserAchievement_userId_status_updatedAt_idx" ON "UserAchievement"("userId", "status", "updatedAt");
CREATE INDEX "UserAchievement_achievementId_status_idx" ON "UserAchievement"("achievementId", "status");

CREATE UNIQUE INDEX "AchievementProcessedEvent_userId_achievementId_eventId_key" ON "AchievementProcessedEvent"("userId", "achievementId", "eventId");
CREATE INDEX "AchievementProcessedEvent_userId_eventType_createdAt_idx" ON "AchievementProcessedEvent"("userId", "eventType", "createdAt");
CREATE INDEX "AchievementProcessedEvent_sourceId_idx" ON "AchievementProcessedEvent"("sourceId");

CREATE UNIQUE INDEX "AchievementRewardTransaction_userAchievementId_key" ON "AchievementRewardTransaction"("userAchievementId");
CREATE UNIQUE INDEX "AchievementRewardTransaction_idempotencyKey_key" ON "AchievementRewardTransaction"("idempotencyKey");
CREATE INDEX "AchievementRewardTransaction_userId_createdAt_idx" ON "AchievementRewardTransaction"("userId", "createdAt");

ALTER TABLE "UserAchievement"
  ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AchievementProcessedEvent"
  ADD CONSTRAINT "AchievementProcessedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AchievementProcessedEvent_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AchievementRewardTransaction"
  ADD CONSTRAINT "AchievementRewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AchievementRewardTransaction_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AchievementRewardTransaction_userAchievementId_fkey" FOREIGN KEY ("userAchievementId") REFERENCES "UserAchievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
