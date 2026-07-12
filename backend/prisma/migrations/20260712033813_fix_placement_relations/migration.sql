-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentPlacementTestId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentPlacementTestId_fkey" FOREIGN KEY ("currentPlacementTestId") REFERENCES "PlacementTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
