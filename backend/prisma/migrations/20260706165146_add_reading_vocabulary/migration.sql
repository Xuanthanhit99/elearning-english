-- CreateTable
CREATE TABLE "ReadingVocabulary" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "example" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingVocabulary_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReadingVocabulary" ADD CONSTRAINT "ReadingVocabulary_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ReadingArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
