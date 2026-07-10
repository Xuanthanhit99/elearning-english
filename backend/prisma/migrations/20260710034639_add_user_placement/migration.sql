-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "PlacementMethod" AS ENUM ('TEST', 'CERTIFICATE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LearningSkill" AS ENUM ('VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING', 'SPEAKING', 'WRITING');

-- CreateTable
CREATE TABLE "UserPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PlacementMethod" NOT NULL,
    "status" "PlacementStatus" NOT NULL DEFAULT 'COMPLETED',
    "overallLevel" "CefrLevel" NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placementId" TEXT,
    "skill" "LearningSkill" NOT NULL,
    "level" "CefrLevel" NOT NULL,
    "score" DOUBLE PRECISION,
    "source" "PlacementMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkillLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPlacement_userId_key" ON "UserPlacement"("userId");

-- CreateIndex
CREATE INDEX "UserSkillLevel_userId_idx" ON "UserSkillLevel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillLevel_userId_skill_key" ON "UserSkillLevel"("userId", "skill");

-- AddForeignKey
ALTER TABLE "UserPlacement" ADD CONSTRAINT "UserPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillLevel" ADD CONSTRAINT "UserSkillLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillLevel" ADD CONSTRAINT "UserSkillLevel_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "UserPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
