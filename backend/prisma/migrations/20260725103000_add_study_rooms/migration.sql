-- CreateEnum
CREATE TYPE "StudyRoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "StudyRoomStatus" AS ENUM ('WAITING', 'IN_SESSION', 'ENDED');

-- CreateEnum
CREATE TYPE "StudyRoomMemberRole" AS ENUM ('HOST', 'MEMBER');

-- CreateEnum
CREATE TYPE "StudyRoomMemberStatus" AS ENUM ('ACTIVE', 'MUTED', 'KICKED', 'BANNED', 'LEFT');

-- CreateTable
CREATE TABLE "StudyRoom" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT,
    "visibility" "StudyRoomVisibility" NOT NULL DEFAULT 'PUBLIC',
    "inviteCode" TEXT,
    "goalMinutes" INTEGER NOT NULL DEFAULT 25,
    "maxMembers" INTEGER NOT NULL DEFAULT 8,
    "status" "StudyRoomStatus" NOT NULL DEFAULT 'WAITING',
    "scheduledStartAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StudyRoomMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "StudyRoomMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "StudyRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "goalMinutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "minutesPresent" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudySessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyRoom_inviteCode_key" ON "StudyRoom"("inviteCode");

-- CreateIndex
CREATE INDEX "StudyRoom_visibility_status_createdAt_idx" ON "StudyRoom"("visibility", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StudyRoom_hostId_idx" ON "StudyRoom"("hostId");

-- CreateIndex
CREATE INDEX "StudyRoom_scheduledStartAt_idx" ON "StudyRoom"("scheduledStartAt");

-- CreateIndex
CREATE INDEX "StudyRoomMember_userId_status_idx" ON "StudyRoomMember"("userId", "status");

-- CreateIndex
CREATE INDEX "StudyRoomMember_roomId_status_idx" ON "StudyRoomMember"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudyRoomMember_roomId_userId_key" ON "StudyRoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "StudySession_roomId_startedAt_idx" ON "StudySession"("roomId", "startedAt");

-- CreateIndex
CREATE INDEX "StudySession_endedAt_endsAt_idx" ON "StudySession"("endedAt", "endsAt");

-- CreateIndex
CREATE INDEX "StudySessionParticipant_userId_idx" ON "StudySessionParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudySessionParticipant_sessionId_userId_key" ON "StudySessionParticipant"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyRoomMember" ADD CONSTRAINT "StudyRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionParticipant" ADD CONSTRAINT "StudySessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySessionParticipant" ADD CONSTRAINT "StudySessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

