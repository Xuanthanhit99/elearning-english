-- CreateEnum
CREATE TYPE "PlacementProcessingStatus" AS ENUM ('WAITING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PlacementProcessingItemStatus" AS ENUM ('WAITING', 'PROCESSING', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PlacementProcessingStep" AS ENUM ('ANSWER_ANALYSIS', 'SKILL_EVALUATION', 'LEARNING_PATH', 'QUALITY_CHECK');

-- CreateTable
CREATE TABLE "PlacementProcessingJob" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlacementProcessingStatus" NOT NULL DEFAULT 'WAITING',
    "currentStep" "PlacementProcessingStep",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "estimatedRemainingSeconds" INTEGER NOT NULL DEFAULT 90,
    "errorMessage" TEXT,
    "nextUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementProcessingStepState" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "step" "PlacementProcessingStep" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PlacementProcessingItemStatus" NOT NULL DEFAULT 'WAITING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlacementProcessingStepState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementProcessingSkillState" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skill" "LearningSkill" NOT NULL,
    "status" "PlacementProcessingItemStatus" NOT NULL DEFAULT 'WAITING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "level" "CefrLevel",
    "message" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PlacementProcessingSkillState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementProcessingLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "PlacementProcessingItemStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementProcessingInsight" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementProcessingInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementProcessingJob_testId_key" ON "PlacementProcessingJob"("testId");

-- CreateIndex
CREATE INDEX "PlacementProcessingJob_userId_idx" ON "PlacementProcessingJob"("userId");

-- CreateIndex
CREATE INDEX "PlacementProcessingJob_status_idx" ON "PlacementProcessingJob"("status");

-- CreateIndex
CREATE INDEX "PlacementProcessingStepState_jobId_order_idx" ON "PlacementProcessingStepState"("jobId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementProcessingStepState_jobId_step_key" ON "PlacementProcessingStepState"("jobId", "step");

-- CreateIndex
CREATE INDEX "PlacementProcessingSkillState_jobId_order_idx" ON "PlacementProcessingSkillState"("jobId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementProcessingSkillState_jobId_skill_key" ON "PlacementProcessingSkillState"("jobId", "skill");

-- CreateIndex
CREATE INDEX "PlacementProcessingLog_jobId_createdAt_idx" ON "PlacementProcessingLog"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "PlacementProcessingInsight_jobId_order_idx" ON "PlacementProcessingInsight"("jobId", "order");

-- AddForeignKey
ALTER TABLE "PlacementProcessingJob" ADD CONSTRAINT "PlacementProcessingJob_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementProcessingJob" ADD CONSTRAINT "PlacementProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementProcessingStepState" ADD CONSTRAINT "PlacementProcessingStepState_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementProcessingSkillState" ADD CONSTRAINT "PlacementProcessingSkillState_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementProcessingLog" ADD CONSTRAINT "PlacementProcessingLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementProcessingInsight" ADD CONSTRAINT "PlacementProcessingInsight_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PlacementProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
