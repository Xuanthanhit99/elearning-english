-- CreateEnum
CREATE TYPE "Language" AS ENUM ('VI', 'EN', 'ZH', 'DE');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'VI';
