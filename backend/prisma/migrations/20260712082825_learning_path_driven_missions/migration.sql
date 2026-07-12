-- CreateEnum
CREATE TYPE "MissionV2Type" AS ENUM ('DAILY', 'WEEKLY', 'ACHIEVEMENT', 'EVENT');

-- CreateEnum
CREATE TYPE "MissionV2Scope" AS ENUM ('GLOBAL', 'LEARNING_PATH', 'PHASE', 'LESSON', 'SKILL');

-- CreateEnum
CREATE TYPE "MissionV2Action" AS ENUM ('STUDY_LESSON', 'COMPLETE_LESSON', 'COMPLETE_QUIZ', 'LEARN_WORD', 'REVIEW_WORD', 'READ_ARTICLE', 'LISTEN_AUDIO', 'COMPLETE_SPEAKING', 'CHECK_WRITING', 'LOGIN', 'EARN_XP', 'STUDY_MINUTES');

-- CreateEnum
CREATE TYPE "MissionV2Status" AS ENUM ('ACTIVE', 'COMPLETED', 'CLAIMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MissionTemplateV2" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MissionV2Type" NOT NULL,
    "scope" "MissionV2Scope" NOT NULL DEFAULT 'GLOBAL',
    "action" "MissionV2Action" NOT NULL,
    "defaultTarget" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardFood" INTEGER NOT NULL DEFAULT 0,
    "rewardEnergy" INTEGER NOT NULL DEFAULT 0,
    "rewardHappiness" INTEGER NOT NULL DEFAULT 0,
    "skill" "LearningSkill",
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionTemplateV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMissionV2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "MissionV2Status" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "MissionV2Type" NOT NULL,
    "scope" "MissionV2Scope" NOT NULL,
    "action" "MissionV2Action" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardFood" INTEGER NOT NULL DEFAULT 0,
    "rewardEnergy" INTEGER NOT NULL DEFAULT 0,
    "rewardHappiness" INTEGER NOT NULL DEFAULT 0,
    "skill" "LearningSkill",
    "placementResultId" TEXT,
    "learningPathPhaseId" TEXT,
    "lessonId" TEXT,
    "quizId" TEXT,
    "articleId" TEXT,
    "courseId" TEXT,
    "metadata" JSONB,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMissionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRewardTransactionV2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userMissionId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "food" INTEGER NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 0,
    "happiness" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionRewardTransactionV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionTemplateV2_code_key" ON "MissionTemplateV2"("code");

-- CreateIndex
CREATE INDEX "MissionTemplateV2_type_isActive_idx" ON "MissionTemplateV2"("type", "isActive");

-- CreateIndex
CREATE INDEX "MissionTemplateV2_action_skill_idx" ON "MissionTemplateV2"("action", "skill");

-- CreateIndex
CREATE INDEX "UserMissionV2_userId_periodKey_status_idx" ON "UserMissionV2"("userId", "periodKey", "status");

-- CreateIndex
CREATE INDEX "UserMissionV2_userId_type_status_idx" ON "UserMissionV2"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "UserMissionV2_lessonId_idx" ON "UserMissionV2"("lessonId");

-- CreateIndex
CREATE INDEX "UserMissionV2_learningPathPhaseId_idx" ON "UserMissionV2"("learningPathPhaseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMissionV2_userId_templateId_periodKey_learningPathPhase_key" ON "UserMissionV2"("userId", "templateId", "periodKey", "learningPathPhaseId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionRewardTransactionV2_userMissionId_key" ON "MissionRewardTransactionV2"("userMissionId");

-- CreateIndex
CREATE INDEX "MissionRewardTransactionV2_userId_createdAt_idx" ON "MissionRewardTransactionV2"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserMissionV2" ADD CONSTRAINT "UserMissionV2_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMissionV2" ADD CONSTRAINT "UserMissionV2_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MissionTemplateV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRewardTransactionV2" ADD CONSTRAINT "MissionRewardTransactionV2_userMissionId_fkey" FOREIGN KEY ("userMissionId") REFERENCES "UserMissionV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
