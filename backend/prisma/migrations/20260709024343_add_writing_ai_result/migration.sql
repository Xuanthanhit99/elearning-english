-- AlterTable
ALTER TABLE "WritingSession" ADD COLUMN     "aiCoachTask" TEXT,
ADD COLUMN     "aiResult" JSONB,
ADD COLUMN     "corrections" JSONB,
ADD COLUMN     "improvements" JSONB,
ADD COLUMN     "learningTips" JSONB,
ADD COLUMN     "strengths" JSONB,
ADD COLUMN     "suggestedVersion" TEXT,
ADD COLUMN     "vocabularySuggestions" JSONB;
