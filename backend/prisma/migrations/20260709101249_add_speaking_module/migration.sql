-- CreateEnum
CREATE TYPE "SpeakingDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "SpeakingPracticeType" AS ENUM ('READ_ALOUD', 'REPEAT_AFTER_ME', 'ANSWER_QUESTIONS', 'FREE_TALK');

-- CreateEnum
CREATE TYPE "SpeakingSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "SpeakingCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingTopic" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "difficulty" "SpeakingDifficulty" NOT NULL DEFAULT 'EASY',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingLesson" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "SpeakingPracticeType" NOT NULL,
    "prompt" TEXT,
    "expectedText" TEXT,
    "difficulty" "SpeakingDifficulty" NOT NULL DEFAULT 'EASY',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 5,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "lessonId" TEXT,
    "status" "SpeakingSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "pronunciation" INTEGER NOT NULL DEFAULT 0,
    "fluency" INTEGER NOT NULL DEFAULT 0,
    "grammar" INTEGER NOT NULL DEFAULT 0,
    "vocabulary" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingCategory_slug_key" ON "SpeakingCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTopic_slug_key" ON "SpeakingTopic"("slug");

-- AddForeignKey
ALTER TABLE "SpeakingTopic" ADD CONSTRAINT "SpeakingTopic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpeakingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingLesson" ADD CONSTRAINT "SpeakingLesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "SpeakingLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
