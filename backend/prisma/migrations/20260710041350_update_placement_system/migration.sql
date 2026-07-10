/*
  Warnings:

  - You are about to drop the column `answer` on the `PlacementQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `explain` on the `PlacementQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `testId` on the `PlacementQuestion` table. All the data in the column will be lost.
  - The `level` column on the `PlacementTest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `level` to the `PlacementQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `PlacementQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PlacementQuestion` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `skill` on the `PlacementQuestion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `PlacementTest` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `PlacementTest` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PlacementTestStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PlacementQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK', 'LISTENING', 'READING', 'SPEAKING', 'WRITING');

-- CreateEnum
CREATE TYPE "LanguageCertificateType" AS ENUM ('IELTS', 'TOEIC', 'TOEFL_IBT', 'CAMBRIDGE', 'CEFR', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificateVerificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

-- DropForeignKey
ALTER TABLE "PlacementTest" DROP CONSTRAINT "PlacementTest_userId_fkey";

-- AlterTable
ALTER TABLE "PlacementQuestion" DROP COLUMN "answer",
DROP COLUMN "explain",
DROP COLUMN "testId",
ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "level" "CefrLevel" NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passage" TEXT,
ADD COLUMN     "type" "PlacementQuestionType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "skill",
ADD COLUMN     "skill" "LearningSkill" NOT NULL,
ALTER COLUMN "options" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PlacementTest" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "PlacementTestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "userId" SET NOT NULL,
DROP COLUMN "level",
ADD COLUMN     "level" "CefrLevel",
ALTER COLUMN "score" SET DEFAULT 0,
ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "result" DROP NOT NULL,
ALTER COLUMN "answers" DROP NOT NULL,
ALTER COLUMN "correct" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "UserPlacement" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED',
ALTER COLUMN "overallLevel" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlacementTestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "aiFeedback" JSONB,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "PlacementTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLanguageCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LanguageCertificateType" NOT NULL,
    "status" "CertificateVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "certificateNumber" TEXT,
    "candidateName" TEXT,
    "organization" TEXT,
    "overallScore" DOUBLE PRECISION,
    "listeningScore" DOUBLE PRECISION,
    "readingScore" DOUBLE PRECISION,
    "speakingScore" DOUBLE PRECISION,
    "writingScore" DOUBLE PRECISION,
    "mappedOverallLevel" "CefrLevel",
    "confidence" DOUBLE PRECISION,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "extractedData" JSONB,
    "verificationMessage" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLanguageCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementTestQuestion_testId_idx" ON "PlacementTestQuestion"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementTestQuestion_testId_questionId_key" ON "PlacementTestQuestion"("testId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementTestQuestion_testId_order_key" ON "PlacementTestQuestion"("testId", "order");

-- CreateIndex
CREATE INDEX "UserLanguageCertificate_userId_idx" ON "UserLanguageCertificate"("userId");

-- CreateIndex
CREATE INDEX "UserLanguageCertificate_status_idx" ON "UserLanguageCertificate"("status");

-- CreateIndex
CREATE INDEX "UserLanguageCertificate_type_idx" ON "UserLanguageCertificate"("type");

-- CreateIndex
CREATE INDEX "PlacementQuestion_skill_level_idx" ON "PlacementQuestion"("skill", "level");

-- CreateIndex
CREATE INDEX "PlacementTest_userId_idx" ON "PlacementTest"("userId");

-- CreateIndex
CREATE INDEX "PlacementTest_status_idx" ON "PlacementTest"("status");

-- CreateIndex
CREATE INDEX "UserSkillLevel_placementId_idx" ON "UserSkillLevel"("placementId");

-- AddForeignKey
ALTER TABLE "PlacementTest" ADD CONSTRAINT "PlacementTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTestQuestion" ADD CONSTRAINT "PlacementTestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PlacementTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTestQuestion" ADD CONSTRAINT "PlacementTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PlacementQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLanguageCertificate" ADD CONSTRAINT "UserLanguageCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
