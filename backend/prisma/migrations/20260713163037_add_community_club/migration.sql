-- CreateEnum
CREATE TYPE "CommunityClubMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BANNED');

-- CreateEnum
CREATE TYPE "CommunityClubEventStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityClubResourceType" AS ENUM ('PDF', 'DOCUMENT', 'LINK', 'AUDIO', 'VIDEO', 'IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "CommunityClubMessage" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityClubMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityClubJoinRequest" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CommunityClubMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityClubJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityClubEvent" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "status" "CommunityClubEventStatus" NOT NULL DEFAULT 'UPCOMING',
    "attendeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityClubEventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityClubEventAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityClubResource" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CommunityClubResourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityClubResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityClubMessage_clubId_createdAt_idx" ON "CommunityClubMessage"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityClubJoinRequest_clubId_status_idx" ON "CommunityClubJoinRequest"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityClubJoinRequest_clubId_userId_key" ON "CommunityClubJoinRequest"("clubId", "userId");

-- CreateIndex
CREATE INDEX "CommunityClubEvent_clubId_startsAt_idx" ON "CommunityClubEvent"("clubId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityClubEventAttendee_eventId_userId_key" ON "CommunityClubEventAttendee"("eventId", "userId");

-- CreateIndex
CREATE INDEX "CommunityClubResource_clubId_createdAt_idx" ON "CommunityClubResource"("clubId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityClubMessage" ADD CONSTRAINT "CommunityClubMessage_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubMessage" ADD CONSTRAINT "CommunityClubMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubJoinRequest" ADD CONSTRAINT "CommunityClubJoinRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubJoinRequest" ADD CONSTRAINT "CommunityClubJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubEvent" ADD CONSTRAINT "CommunityClubEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubEvent" ADD CONSTRAINT "CommunityClubEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubEventAttendee" ADD CONSTRAINT "CommunityClubEventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubEventAttendee" ADD CONSTRAINT "CommunityClubEventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubResource" ADD CONSTRAINT "CommunityClubResource_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubResource" ADD CONSTRAINT "CommunityClubResource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
