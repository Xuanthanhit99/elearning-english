/*
  Warnings:

  - You are about to drop the column `level` on the `WritingTopic` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `WritingTopic` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WritingTopic" DROP COLUMN "level",
DROP COLUMN "type",
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "learnerCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WritingTopicProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTopicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingTopicProgress_userId_idx" ON "WritingTopicProgress"("userId");

-- CreateIndex
CREATE INDEX "WritingTopicProgress_topicId_idx" ON "WritingTopicProgress"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingTopicProgress_userId_topicId_key" ON "WritingTopicProgress"("userId", "topicId");

-- AddForeignKey
ALTER TABLE "WritingTopicProgress" ADD CONSTRAINT "WritingTopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "WritingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
