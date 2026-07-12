/*
  Warnings:

  - A unique constraint covering the columns `[questionHash]` on the table `PlacementQuestion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PlacementQuestion" ADD COLUMN     "questionHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlacementQuestion_questionHash_key" ON "PlacementQuestion"("questionHash");
