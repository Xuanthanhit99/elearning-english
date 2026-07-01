-- Complete vocabulary weekly-test and spaced-repetition schema.

ALTER TYPE "WordProgressStatus" ADD VALUE IF NOT EXISTS 'MASTERED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyVocabularyStatus') THEN
    CREATE TYPE "DailyVocabularyStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'COMPLETED', 'MISSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VocabularyQuestionType') THEN
    CREATE TYPE "VocabularyQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'WRITE_MEANING', 'WRITE_WORD', 'WRITE_SENTENCE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WeeklyTestStatus') THEN
    CREATE TYPE "WeeklyTestStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'PASSED', 'FAILED');
  END IF;
END $$;

ALTER TABLE "UserWordProgress"
  ADD COLUMN IF NOT EXISTS "correctCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "wrongCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "easeFactor" INTEGER NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS "interval" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "masteredAt" TIMESTAMP(3);

ALTER TABLE "UserDailyVocabularyPlan"
  ADD COLUMN IF NOT EXISTS "status" "DailyVocabularyStatus" NOT NULL DEFAULT 'AVAILABLE';

CREATE TABLE IF NOT EXISTS "WeeklyVocabularyTest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "WeeklyTestStatus" NOT NULL DEFAULT 'LOCKED',
  "totalQuestions" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "passScore" INTEGER NOT NULL DEFAULT 70,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "unlockedAt" TIMESTAMP(3),
  "passedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeeklyVocabularyTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeeklyVocabularyQuestion" (
  "id" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "type" "VocabularyQuestionType" NOT NULL,
  "question" TEXT NOT NULL,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "answer" TEXT NOT NULL,
  "userAnswer" TEXT,
  "isCorrect" BOOLEAN,
  "score" INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL,
  CONSTRAINT "WeeklyVocabularyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyVocabularyTest_userId_planId_key" ON "WeeklyVocabularyTest"("userId", "planId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyVocabularyTest_userId_fkey') THEN
    ALTER TABLE "WeeklyVocabularyTest"
      ADD CONSTRAINT "WeeklyVocabularyTest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyVocabularyTest_planId_fkey') THEN
    ALTER TABLE "WeeklyVocabularyTest"
      ADD CONSTRAINT "WeeklyVocabularyTest_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "UserWeeklyVocabularyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyVocabularyQuestion_testId_fkey') THEN
    ALTER TABLE "WeeklyVocabularyQuestion"
      ADD CONSTRAINT "WeeklyVocabularyQuestion_testId_fkey"
      FOREIGN KEY ("testId") REFERENCES "WeeklyVocabularyTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyVocabularyQuestion_wordId_fkey') THEN
    ALTER TABLE "WeeklyVocabularyQuestion"
      ADD CONSTRAINT "WeeklyVocabularyQuestion_wordId_fkey"
      FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
