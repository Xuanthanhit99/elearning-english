/*
  Warnings:

  - You are about to drop the column `createdAt` on the `UserWordHistory` table. All the data in the column will be lost.
  - You are about to drop the column `definition` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `examples` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `ipa` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `mainMeaning` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `phrases` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `shortExplanation` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sourceLanguage` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `targetLanguage` on the `Word` table. All the data in the column will be lost.
  - The `synonyms` column on the `Word` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[word]` on the table `Word` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `keyword` to the `UserWordHistory` table without a default value. This is not possible if the table is not empty.
  - Made the column `level` on table `Word` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "WordSource" AS ENUM ('SEED', 'DICTIONARY_API', 'GEMINI', 'ADMIN');

-- CreateEnum
CREATE TYPE "WordProgressStatus" AS ENUM ('NEW', 'LEARNING', 'KNOWN', 'REVIEW');

-- DropIndex
DROP INDEX "UserWordHistory_userId_wordId_key";

-- DropIndex
DROP INDEX "Word_word_sourceLanguage_targetLanguage_level_key";

-- AlterTable
ALTER TABLE "UserWordHistory" DROP COLUMN "createdAt",
ADD COLUMN     "keyword" TEXT NOT NULL,
ADD COLUMN     "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "definition",
DROP COLUMN "examples",
DROP COLUMN "ipa",
DROP COLUMN "mainMeaning",
DROP COLUMN "phrases",
DROP COLUMN "shortExplanation",
DROP COLUMN "sourceLanguage",
DROP COLUMN "targetLanguage",
ADD COLUMN     "antonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "example" TEXT,
ADD COLUMN     "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meaningEn" TEXT,
ADD COLUMN     "meaningVi" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phonetic" TEXT,
ADD COLUMN     "searchCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" "WordSource" NOT NULL DEFAULT 'SEED',
ADD COLUMN     "topicId" TEXT,
ALTER COLUMN "level" SET NOT NULL,
ALTER COLUMN "level" SET DEFAULT 'A1',
DROP COLUMN "synonyms",
ADD COLUMN     "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "UserLearningProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'A1',
    "goal" TEXT,
    "dailyWordTarget" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLearningProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordTopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWordProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" "WordProgressStatus" NOT NULL DEFAULT 'NEW',
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "learnedAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWordProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTopicPool" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTopicPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTopicPoolItem" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "WeeklyTopicPoolItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWeeklyVocabularyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWeeklyVocabularyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyVocabularyPlan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "topicId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDailyVocabularyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyVocabularyWord" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "UserDailyVocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLearningProfile_userId_key" ON "UserLearningProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WordTopic_slug_key" ON "WordTopic"("slug");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_idx" ON "UserWordProgress"("userId");

-- CreateIndex
CREATE INDEX "UserWordProgress_wordId_idx" ON "UserWordProgress"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWordProgress_userId_wordId_key" ON "UserWordProgress"("userId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTopicPool_level_weekStart_key" ON "WeeklyTopicPool"("level", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyTopicPoolItem_poolId_topicId_key" ON "WeeklyTopicPoolItem"("poolId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWeeklyVocabularyPlan_userId_weekStart_key" ON "UserWeeklyVocabularyPlan"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyVocabularyPlan_planId_date_key" ON "UserDailyVocabularyPlan"("planId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserDailyVocabularyWord_dayId_wordId_key" ON "UserDailyVocabularyWord"("dayId", "wordId");

-- CreateIndex
CREATE INDEX "UserWordHistory_userId_idx" ON "UserWordHistory"("userId");

-- CreateIndex
CREATE INDEX "UserWordHistory_wordId_idx" ON "UserWordHistory"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_word_key" ON "Word"("word");

-- CreateIndex
CREATE INDEX "Word_level_idx" ON "Word"("level");

-- CreateIndex
CREATE INDEX "Word_topicId_idx" ON "Word"("topicId");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "WordTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLearningProfile" ADD CONSTRAINT "UserLearningProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordProgress" ADD CONSTRAINT "UserWordProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordProgress" ADD CONSTRAINT "UserWordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTopicPoolItem" ADD CONSTRAINT "WeeklyTopicPoolItem_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WeeklyTopicPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTopicPoolItem" ADD CONSTRAINT "WeeklyTopicPoolItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "WordTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWeeklyVocabularyPlan" ADD CONSTRAINT "UserWeeklyVocabularyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWeeklyVocabularyPlan" ADD CONSTRAINT "UserWeeklyVocabularyPlan_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WeeklyTopicPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyVocabularyPlan" ADD CONSTRAINT "UserDailyVocabularyPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UserWeeklyVocabularyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyVocabularyPlan" ADD CONSTRAINT "UserDailyVocabularyPlan_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "WordTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyVocabularyWord" ADD CONSTRAINT "UserDailyVocabularyWord_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "UserDailyVocabularyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyVocabularyWord" ADD CONSTRAINT "UserDailyVocabularyWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
