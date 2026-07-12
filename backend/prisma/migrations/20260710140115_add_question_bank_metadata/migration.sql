-- AlterTable
ALTER TABLE "PlacementQuestion" ADD COLUMN     "audioScript" TEXT,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PlacementQuestion_usageCount_idx" ON "PlacementQuestion"("usageCount");
