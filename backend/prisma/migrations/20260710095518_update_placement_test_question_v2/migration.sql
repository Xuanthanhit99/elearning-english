-- AlterTable
ALTER TABLE "PlacementTestQuestion" ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSkipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spentSeconds" INTEGER NOT NULL DEFAULT 0;
