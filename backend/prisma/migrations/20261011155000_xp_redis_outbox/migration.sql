-- Durable XP Redis projection intents. Must be inserted in the same
-- PostgreSQL transaction as XpTransaction and LeaderboardEntry updates.
CREATE TABLE "XpRedisOutbox" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "projection" TEXT NOT NULL,
  "redisKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seasonId" TEXT,
  "groupId" TEXT,
  "skill" "LearningSkill",
  "periodKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "XpRedisOutbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "XpRedisOutbox_transactionId_projection_key"
  ON "XpRedisOutbox"("transactionId", "projection");
CREATE INDEX "XpRedisOutbox_status_nextAttemptAt_idx"
  ON "XpRedisOutbox"("status", "nextAttemptAt");
CREATE INDEX "XpRedisOutbox_redisKey_userId_idx"
  ON "XpRedisOutbox"("redisKey", "userId");
