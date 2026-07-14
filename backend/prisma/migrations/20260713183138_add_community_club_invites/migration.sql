-- CreateEnum
CREATE TYPE "CommunityClubInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CommunityClubInvite" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "CommunityClubInviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CommunityClubInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityClubInvite_inviteeId_status_idx" ON "CommunityClubInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "CommunityClubInvite_clubId_status_idx" ON "CommunityClubInvite"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityClubInvite_clubId_inviteeId_key" ON "CommunityClubInvite"("clubId", "inviteeId");

-- AddForeignKey
ALTER TABLE "CommunityClubInvite" ADD CONSTRAINT "CommunityClubInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubInvite" ADD CONSTRAINT "CommunityClubInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubInvite" ADD CONSTRAINT "CommunityClubInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
