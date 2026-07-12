-- AlterTable
ALTER TABLE "SpeakingSession" ADD COLUMN     "confidence" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SpeakingAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedText" TEXT,
    "transcript" TEXT NOT NULL,
    "audioUrl" TEXT,
    "pronunciation" INTEGER NOT NULL DEFAULT 0,
    "fluency" INTEGER NOT NULL DEFAULT 0,
    "grammar" INTEGER NOT NULL DEFAULT 0,
    "vocabulary" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "correctedText" TEXT,
    "suggestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingLessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastScore" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingLessonProgress_userId_lessonId_key" ON "SpeakingLessonProgress"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "SpeakingAnswer" ADD CONSTRAINT "SpeakingAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
