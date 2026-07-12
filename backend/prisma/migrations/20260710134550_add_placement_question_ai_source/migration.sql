-- CreateEnum
CREATE TYPE "PlacementQuestionSource" AS ENUM ('SEED', 'GEMINI', 'ADMIN');

-- AlterTable
ALTER TABLE "PlacementQuestion" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "generationKey" TEXT,
ADD COLUMN     "source" "PlacementQuestionSource" NOT NULL DEFAULT 'SEED';

-- CreateIndex
CREATE INDEX "PlacementQuestion_skill_level_type_idx" ON "PlacementQuestion"("skill", "level", "type");

-- CreateIndex
CREATE INDEX "PlacementQuestion_source_idx" ON "PlacementQuestion"("source");
