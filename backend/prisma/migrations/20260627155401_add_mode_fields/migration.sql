-- CreateEnum
CREATE TYPE "ModeType" AS ENUM ('LEVEL_BASED', 'ADAPTIVE');

-- AlterTable
ALTER TABLE "PlacementTest" ADD COLUMN     "mode" "ModeType" NOT NULL DEFAULT 'ADAPTIVE';
