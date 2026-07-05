-- CreateEnum
CREATE TYPE "GrammarDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "GrammarAnswerStatus" AS ENUM ('CORRECT', 'WRONG', 'SKIPPED');

-- CreateTable
CREATE TABLE "GrammarTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarLesson" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "theory" JSONB,
    "tip" TEXT,
    "level" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "prompt" TEXT NOT NULL,
    "sentence" TEXT,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "GrammarDifficulty" NOT NULL DEFAULT 'EASY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarPracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "currentQuestion" INTEGER NOT NULL DEFAULT 1,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarPracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarUserAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "status" "GrammarAnswerStatus" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarUserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarQuestionReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarQuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarPracticeSession_userId_idx" ON "GrammarPracticeSession"("userId");

-- CreateIndex
CREATE INDEX "GrammarPracticeSession_lessonId_idx" ON "GrammarPracticeSession"("lessonId");

-- CreateIndex
CREATE INDEX "GrammarUserAnswer_userId_idx" ON "GrammarUserAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarUserAnswer_sessionId_questionId_key" ON "GrammarUserAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "GrammarQuestionReport_questionId_idx" ON "GrammarQuestionReport"("questionId");

-- CreateIndex
CREATE INDEX "GrammarQuestionReport_userId_idx" ON "GrammarQuestionReport"("userId");

-- AddForeignKey
ALTER TABLE "GrammarLesson" ADD CONSTRAINT "GrammarLesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarQuestion" ADD CONSTRAINT "GrammarQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarPracticeSession" ADD CONSTRAINT "GrammarPracticeSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarUserAnswer" ADD CONSTRAINT "GrammarUserAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GrammarPracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarUserAnswer" ADD CONSTRAINT "GrammarUserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GrammarQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
