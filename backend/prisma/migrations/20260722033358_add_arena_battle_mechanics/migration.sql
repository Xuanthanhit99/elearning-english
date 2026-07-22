-- CreateEnum
CREATE TYPE "ArenaPowerUpType" AS ENUM ('DOUBLE_SCORE', 'SHIELD', 'FREEZE', 'TIME_BOOST');

-- CreateEnum
CREATE TYPE "ArenaPowerUpEffectStatus" AS ENUM ('PENDING', 'ACTIVE', 'CONSUMED', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ArenaBattleEventType" AS ENUM ('ANSWER_CORRECT', 'ANSWER_WRONG', 'ANSWER_LATE', 'COMBO_INCREASED', 'COMBO_BROKEN', 'POWER_UP_USED', 'POWER_UP_BLOCKED', 'POWER_UP_APPLIED', 'POWER_UP_CONSUMED', 'SCORE_UPDATED', 'PLAYER_FORFEITED', 'MATCH_FINISHED');

-- AlterTable
ALTER TABLE "ArenaMatch" ADD COLUMN     "activeQuestionOrder" INTEGER,
ADD COLUMN     "eventSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionActivatedAt" TIMESTAMP(3),
ADD COLUMN     "questionDeadlineAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ArenaParticipantBattleState" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "combo" INTEGER NOT NULL DEFAULT 0,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "wrongStreak" INTEGER NOT NULL DEFAULT 0,
    "multiplierBasisPoints" INTEGER NOT NULL DEFAULT 10000,
    "shieldCharges" INTEGER NOT NULL DEFAULT 0,
    "deadlineOverrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaParticipantBattleState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaMatchPowerUp" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ArenaPowerUpType" NOT NULL,
    "remainingUses" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaMatchPowerUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaPowerUpEffect" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "type" "ArenaPowerUpType" NOT NULL,
    "status" "ArenaPowerUpEffectStatus" NOT NULL DEFAULT 'PENDING',
    "appliesFromQuestionOrder" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "remainingTriggers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "ArenaPowerUpEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaPowerUpUsage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ArenaPowerUpType" NOT NULL,
    "targetUserId" TEXT,
    "clientRequestId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaPowerUpUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaBattleEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "ArenaBattleEventType" NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "questionId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaBattleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArenaParticipantBattleState_matchId_participantId_key" ON "ArenaParticipantBattleState"("matchId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaMatchPowerUp_matchId_userId_type_key" ON "ArenaMatchPowerUp"("matchId", "userId", "type");

-- CreateIndex
CREATE INDEX "ArenaPowerUpEffect_matchId_targetUserId_status_idx" ON "ArenaPowerUpEffect"("matchId", "targetUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaPowerUpUsage_matchId_userId_clientRequestId_key" ON "ArenaPowerUpUsage"("matchId", "userId", "clientRequestId");

-- CreateIndex
CREATE INDEX "ArenaBattleEvent_matchId_createdAt_idx" ON "ArenaBattleEvent"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaBattleEvent_matchId_sequence_key" ON "ArenaBattleEvent"("matchId", "sequence");

-- AddForeignKey
ALTER TABLE "ArenaParticipantBattleState" ADD CONSTRAINT "ArenaParticipantBattleState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaParticipantBattleState" ADD CONSTRAINT "ArenaParticipantBattleState_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ArenaParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatchPowerUp" ADD CONSTRAINT "ArenaMatchPowerUp_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatchPowerUp" ADD CONSTRAINT "ArenaMatchPowerUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaPowerUpEffect" ADD CONSTRAINT "ArenaPowerUpEffect_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaPowerUpUsage" ADD CONSTRAINT "ArenaPowerUpUsage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaBattleEvent" ADD CONSTRAINT "ArenaBattleEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ArenaMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
