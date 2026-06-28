-- CreateTable
CREATE TABLE "PronunciationExercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sentence',
    "level" TEXT NOT NULL DEFAULT 'A2',
    "text" TEXT NOT NULL,
    "ipa" TEXT,
    "focusSounds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PronunciationExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PronunciationResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "audioUrl" TEXT,
    "score" INTEGER NOT NULL,
    "clarity" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "endingSound" INTEGER NOT NULL,
    "fluency" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PronunciationResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PronunciationResult" ADD CONSTRAINT "PronunciationResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PronunciationResult" ADD CONSTRAINT "PronunciationResult_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "PronunciationExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
