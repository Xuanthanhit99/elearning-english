-- AlterTable
ALTER TABLE "WritingLesson" ADD COLUMN     "sampleEssay" TEXT;

-- AlterTable
ALTER TABLE "WritingSession" ADD COLUMN     "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0;
