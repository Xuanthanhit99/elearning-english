-- CreateEnum
CREATE TYPE "QuickAction" AS ENUM ('CHEER_UP', 'BANTER', 'QUICK_TIP');

-- CreateTable
CREATE TABLE "UserPet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Miu',
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPet_userId_key" ON "UserPet"("userId");

-- AddForeignKey
ALTER TABLE "UserPet" ADD CONSTRAINT "UserPet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
