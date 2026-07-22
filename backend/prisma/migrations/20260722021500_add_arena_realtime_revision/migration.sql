-- AlterTable
ALTER TABLE "ArenaMatch" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ArenaRoom" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;
