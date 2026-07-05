/*
  Warnings:

  - You are about to drop the column `aiPrompt` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `dailyGenerate` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `isGenerateAI` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `maxQuestions` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `theory` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `tip` on the `GrammarLesson` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `GrammarQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `GrammarQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `sentence` on the `GrammarQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `sentenceHash` on the `GrammarQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `GrammarQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `GrammarTopic` table. All the data in the column will be lost.
  - The `level` column on the `GrammarTopic` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `GrammarPracticeSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GrammarQuestionReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GrammarUserAnswer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `GrammarLesson` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[explanation]` on the table `GrammarQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `GrammarLesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `GrammarLesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `GrammarQuestion` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `difficulty` on the `GrammarQuestion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `categoryId` to the `GrammarTopic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `GrammarTopic` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GrammarLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "GrammarQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK', 'REORDER_SENTENCE', 'TRUE_FALSE');

-- DropForeignKey
ALTER TABLE "GrammarPracticeSession" DROP CONSTRAINT "GrammarPracticeSession_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "GrammarUserAnswer" DROP CONSTRAINT "GrammarUserAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "GrammarUserAnswer" DROP CONSTRAINT "GrammarUserAnswer_sessionId_fkey";

-- DropIndex
DROP INDEX "GrammarQuestion_lessonId_idx";

-- DropIndex
DROP INDEX "GrammarQuestion_sentenceHash_key";

-- AlterTable
ALTER TABLE "GrammarLesson" DROP COLUMN "aiPrompt",
DROP COLUMN "dailyGenerate",
DROP COLUMN "description",
DROP COLUMN "isGenerateAI",
DROP COLUMN "level",
DROP COLUMN "maxQuestions",
DROP COLUMN "theory",
DROP COLUMN "tip",
ADD COLUMN     "content" JSONB NOT NULL,
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "isActive" SET DEFAULT true;

-- AlterTable
ALTER TABLE "GrammarQuestion" DROP COLUMN "answer",
DROP COLUMN "prompt",
DROP COLUMN "sentence",
DROP COLUMN "sentenceHash",
DROP COLUMN "type",
ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "question" TEXT NOT NULL,
ALTER COLUMN "options" DROP NOT NULL,
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "GrammarLevel" NOT NULL;

-- AlterTable
ALTER TABLE "GrammarTopic" DROP COLUMN "createAt",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "level",
ADD COLUMN     "level" "GrammarLevel";

-- DropTable
DROP TABLE "GrammarPracticeSession";

-- DropTable
DROP TABLE "GrammarQuestionReport";

-- DropTable
DROP TABLE "GrammarUserAnswer";

-- DropEnum
DROP TYPE "GrammarAnswerStatus";

-- DropEnum
DROP TYPE "GrammarDifficulty";

-- CreateTable
CREATE TABLE "GrammarCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarLessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarTopicProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "averageScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarTopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_slug_key" ON "GrammarCategory"("slug");

-- CreateIndex
CREATE INDEX "GrammarLessonProgress_userId_lessonId_idx" ON "GrammarLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarTopicProgress_userId_topicId_key" ON "GrammarTopicProgress"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarLesson_slug_key" ON "GrammarLesson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarQuestion_explanation_key" ON "GrammarQuestion"("explanation");

-- AddForeignKey
ALTER TABLE "GrammarTopic" ADD CONSTRAINT "GrammarTopic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GrammarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarLessonProgress" ADD CONSTRAINT "GrammarLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarLessonProgress" ADD CONSTRAINT "GrammarLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarTopicProgress" ADD CONSTRAINT "GrammarTopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarTopicProgress" ADD CONSTRAINT "GrammarTopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
