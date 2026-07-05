ALTER TABLE "GrammarQuestion"
ADD COLUMN "sentenceHash" TEXT;

UPDATE "GrammarQuestion"
SET "sentenceHash" = md5(COALESCE("sentence", '') || '-' || "id");

UPDATE "GrammarQuestion"
SET "sentence" = ''
WHERE "sentence" IS NULL;

ALTER TABLE "GrammarQuestion"
ALTER COLUMN "sentenceHash" SET NOT NULL,
ALTER COLUMN "sentence" SET NOT NULL;

CREATE UNIQUE INDEX "GrammarQuestion_sentenceHash_key"
ON "GrammarQuestion"("sentenceHash");

CREATE INDEX "GrammarQuestion_lessonId_idx"
ON "GrammarQuestion"("lessonId");