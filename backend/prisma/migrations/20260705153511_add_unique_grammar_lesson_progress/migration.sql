/*
  Warnings:

  - A unique constraint covering the columns `[userId,lessonId]` on the table `GrammarLessonProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GrammarLessonProgress_userId_lessonId_key" ON "GrammarLessonProgress"("userId", "lessonId");
