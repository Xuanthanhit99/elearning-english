-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "SpeakingExercise" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcript" TEXT,
    "score" INTEGER,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SpeakingExercise" ADD CONSTRAINT "SpeakingExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingResult" ADD CONSTRAINT "SpeakingResult_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingResult" ADD CONSTRAINT "SpeakingResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingResult" ADD CONSTRAINT "SpeakingResult_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "SpeakingExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
