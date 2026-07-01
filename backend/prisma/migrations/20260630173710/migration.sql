-- DropIndex
DROP INDEX "UserWordProgress_wordId_idx";

-- CreateIndex
CREATE INDEX "UserWordProgress_reviewAt_idx" ON "UserWordProgress"("reviewAt");
