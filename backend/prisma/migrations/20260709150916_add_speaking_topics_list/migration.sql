/*
  Warnings:

  - The values [EASY,MEDIUM,HARD] on the enum `SpeakingDifficulty` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SpeakingLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- AlterEnum
BEGIN;
CREATE TYPE "SpeakingDifficulty_new" AS ENUM ('BEGINNER', 'PRE_INTERMEDIATE', 'INTERMEDIATE', 'ADVANCED');
ALTER TABLE "public"."SpeakingLesson" ALTER COLUMN "difficulty" DROP DEFAULT;
ALTER TABLE "public"."SpeakingTopic" ALTER COLUMN "difficulty" DROP DEFAULT;
ALTER TABLE "SpeakingTopic" ALTER COLUMN "difficulty" TYPE "SpeakingDifficulty_new" USING ("difficulty"::text::"SpeakingDifficulty_new");
ALTER TABLE "SpeakingLesson" ALTER COLUMN "difficulty" TYPE "SpeakingDifficulty_new" USING ("difficulty"::text::"SpeakingDifficulty_new");
ALTER TYPE "SpeakingDifficulty" RENAME TO "SpeakingDifficulty_old";
ALTER TYPE "SpeakingDifficulty_new" RENAME TO "SpeakingDifficulty";
DROP TYPE "public"."SpeakingDifficulty_old";
ALTER TABLE "SpeakingLesson" ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';
ALTER TABLE "SpeakingTopic" ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';
COMMIT;

-- AlterTable
ALTER TABLE "SpeakingCategory" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "SpeakingLesson" ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';

-- AlterTable
ALTER TABLE "SpeakingTopic" ADD COLUMN     "lessonCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxLevel" "SpeakingLevel" NOT NULL DEFAULT 'B1',
ADD COLUMN     "minLevel" "SpeakingLevel" NOT NULL DEFAULT 'A1',
ADD COLUMN     "progressPercent" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';
