-- CreateEnum
CREATE TYPE "WritingType" AS ENUM ('ESSAY', 'EMAIL', 'STORY', 'SENTENCE');

-- CreateEnum
CREATE TYPE "WritingLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1');

-- CreateTable
CREATE TABLE "WritingTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "level" "WritingLevel" NOT NULL DEFAULT 'A1',
    "type" "WritingType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingLesson" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT,
    "minWords" INTEGER NOT NULL DEFAULT 80,
    "maxWords" INTEGER NOT NULL DEFAULT 200,
    "level" "WritingLevel" NOT NULL,
    "type" "WritingType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "content" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "overallScore" INTEGER,
    "grammarScore" INTEGER,
    "vocabularyScore" INTEGER,
    "coherenceScore" INTEGER,
    "taskScore" INTEGER,
    "feedback" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WritingTopic_slug_key" ON "WritingTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WritingLesson_slug_key" ON "WritingLesson"("slug");

-- CreateIndex
CREATE INDEX "WritingSession_userId_idx" ON "WritingSession"("userId");

-- CreateIndex
CREATE INDEX "WritingSession_lessonId_idx" ON "WritingSession"("lessonId");

-- AddForeignKey
ALTER TABLE "WritingLesson" ADD CONSTRAINT "WritingLesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "WritingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSession" ADD CONSTRAINT "WritingSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "WritingLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
