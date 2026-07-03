/*
  Warnings:

  - You are about to drop the column `SelectrdAnswer` on the `ListeningSessionAnswer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ListeningSession" ADD COLUMN     "coinsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ListeningSessionAnswer" DROP COLUMN "SelectrdAnswer",
ADD COLUMN     "selectedAnswer" TEXT;
