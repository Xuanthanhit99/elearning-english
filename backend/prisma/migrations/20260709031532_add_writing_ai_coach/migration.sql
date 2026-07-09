-- AlterTable
ALTER TABLE "WritingSession" ADD COLUMN     "nextPracticeSuggestion" TEXT,
ADD COLUMN     "rewriteRequired" BOOLEAN NOT NULL DEFAULT false;
