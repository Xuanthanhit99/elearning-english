-- AlterTable
ALTER TABLE "WritingLesson" ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "learnerCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WritingTopic" ADD COLUMN     "about" TEXT,
ADD COLUMN     "levelText" TEXT,
ADD COLUMN     "tips" TEXT;
