/*
  Warnings:

  - You are about to drop the column `result` on the `PlacementTest` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlacementResultStatus" AS ENUM ('DRAFT', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "PlacementTest" DROP COLUMN "result";

-- CreateTable
CREATE TABLE "PlacementResult" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlacementResultStatus" NOT NULL DEFAULT 'DRAFT',
    "overallScore" DOUBLE PRECISION NOT NULL,
    "overallLevel" "CefrLevel" NOT NULL,
    "percentile" INTEGER,
    "confidence" INTEGER,
    "summary" TEXT,
    "strengths" JSONB,
    "improvements" JSONB,
    "projectedLevel" "CefrLevel",
    "projectedWeeksMin" INTEGER,
    "projectedWeeksMax" INTEGER,
    "processedSeconds" INTEGER,
    "certificateCode" TEXT,
    "certificateUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementResultSkill" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "skill" "LearningSkill" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "CefrLevel",
    "status" "PlacementProcessingItemStatus" NOT NULL,
    "rating" DOUBLE PRECISION,
    "label" TEXT,
    "strengths" JSONB,
    "improvements" JSONB,
    "feedback" TEXT,

    CONSTRAINT "PlacementResultSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementLearningPathPhase" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "targetLevel" "CefrLevel",
    "weeksMin" INTEGER NOT NULL,
    "weeksMax" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlacementLearningPathPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementLearningPriority" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "skill" "LearningSkill" NOT NULL,
    "priority" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "PlacementLearningPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementRecommendedCourse" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "thumbnail" TEXT,
    "rating" DOUBLE PRECISION,
    "reviews" INTEGER,
    "lessonCount" INTEGER,
    "reason" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PlacementRecommendedCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlacementResult_testId_key" ON "PlacementResult"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementResult_certificateCode_key" ON "PlacementResult"("certificateCode");

-- CreateIndex
CREATE INDEX "PlacementResult_userId_generatedAt_idx" ON "PlacementResult"("userId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementResultSkill_resultId_skill_key" ON "PlacementResultSkill"("resultId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementLearningPathPhase_resultId_phase_key" ON "PlacementLearningPathPhase"("resultId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementLearningPriority_resultId_priority_key" ON "PlacementLearningPriority"("resultId", "priority");

-- CreateIndex
CREATE INDEX "PlacementRecommendedCourse_resultId_order_idx" ON "PlacementRecommendedCourse"("resultId", "order");

-- AddForeignKey
ALTER TABLE "PlacementResult" ADD CONSTRAINT "PlacementResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementResult" ADD CONSTRAINT "PlacementResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementResultSkill" ADD CONSTRAINT "PlacementResultSkill_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "PlacementResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementLearningPathPhase" ADD CONSTRAINT "PlacementLearningPathPhase_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "PlacementResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementLearningPriority" ADD CONSTRAINT "PlacementLearningPriority_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "PlacementResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementRecommendedCourse" ADD CONSTRAINT "PlacementRecommendedCourse_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "PlacementResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
