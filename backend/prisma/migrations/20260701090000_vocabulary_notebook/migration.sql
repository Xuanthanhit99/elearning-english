CREATE TABLE IF NOT EXISTS "UserVocabularyNotebook" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserVocabularyNotebook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserVocabularyNotebook_userId_wordId_key" ON "UserVocabularyNotebook"("userId", "wordId");
CREATE INDEX IF NOT EXISTS "UserVocabularyNotebook_userId_idx" ON "UserVocabularyNotebook"("userId");
CREATE INDEX IF NOT EXISTS "UserVocabularyNotebook_wordId_idx" ON "UserVocabularyNotebook"("wordId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserVocabularyNotebook_userId_fkey') THEN
    ALTER TABLE "UserVocabularyNotebook"
      ADD CONSTRAINT "UserVocabularyNotebook_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserVocabularyNotebook_wordId_fkey') THEN
    ALTER TABLE "UserVocabularyNotebook"
      ADD CONSTRAINT "UserVocabularyNotebook_wordId_fkey"
      FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
