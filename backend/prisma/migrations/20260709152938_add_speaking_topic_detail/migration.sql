/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `SpeakingLesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `SpeakingLesson` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SpeakingLessonStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED');

-- AlterTable
ALTER TABLE "SpeakingLesson" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" "SpeakingLevel" NOT NULL DEFAULT 'A1',
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingLesson_slug_key" ON "SpeakingLesson"("slug");
