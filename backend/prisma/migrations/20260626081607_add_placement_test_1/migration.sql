/*
  Warnings:

  - Added the required column `correct` to the `PlacementTest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlacementTest" ADD COLUMN     "correct" INTEGER NOT NULL;
