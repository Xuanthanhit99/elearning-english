/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,questionId]` on the table `ListeningSessionAnswer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ListeningSessionAnswer_sessionId_questionId_key" ON "ListeningSessionAnswer"("sessionId", "questionId");
