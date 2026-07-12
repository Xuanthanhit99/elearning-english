/*
  Warnings:

  - A unique constraint covering the columns `[questionHash]` on the table `ListeningQuestion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ListeningQuestion" ADD COLUMN     "questionHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ListeningQuestion_questionHash_key" ON "ListeningQuestion"("questionHash");

-- CreateIndex
CREATE INDEX "ListeningQuestion_level_topic_isActive_idx" ON "ListeningQuestion"("level", "topic", "isActive");
