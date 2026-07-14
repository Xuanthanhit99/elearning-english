-- CreateEnum
CREATE TYPE "CommunityClubRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityClubPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CommunityChallengeStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityChallengeParticipantStatus" AS ENUM ('JOINED', 'COMPLETED', 'LEFT');

-- CreateEnum
CREATE TYPE "CommunityFriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunityConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "CommunityActivityType" AS ENUM ('CREATE_POST', 'CREATE_COMMENT', 'RECEIVE_REACTION', 'JOIN_CLUB', 'COMPLETE_CHALLENGE', 'SEND_MESSAGE');

-- CreateTable
CREATE TABLE "CommunityClub" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "iconUrl" TEXT,
    "privacy" "CommunityClubPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityClubMember" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityClubRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChallenge" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "clubId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverUrl" TEXT,
    "status" "CommunityChallengeStatus" NOT NULL DEFAULT 'UPCOMING',
    "target" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityChallengeParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFriendRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "CommunityFriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityFriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFriendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFriendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityConversation" (
    "id" TEXT NOT NULL,
    "type" "CommunityConversationType" NOT NULL DEFAULT 'DIRECT',
    "title" TEXT,
    "avatarUrl" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunityActivityType" NOT NULL,
    "points" INTEGER NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityClub_slug_key" ON "CommunityClub"("slug");

-- CreateIndex
CREATE INDEX "CommunityClub_ownerId_idx" ON "CommunityClub"("ownerId");

-- CreateIndex
CREATE INDEX "CommunityClub_privacy_isActive_createdAt_idx" ON "CommunityClub"("privacy", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityClub_memberCount_idx" ON "CommunityClub"("memberCount");

-- CreateIndex
CREATE INDEX "CommunityClubMember_userId_joinedAt_idx" ON "CommunityClubMember"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityClubMember_clubId_userId_key" ON "CommunityClubMember"("clubId", "userId");

-- CreateIndex
CREATE INDEX "CommunityChallenge_status_startsAt_endsAt_idx" ON "CommunityChallenge"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CommunityChallenge_clubId_idx" ON "CommunityChallenge"("clubId");

-- CreateIndex
CREATE INDEX "CommunityChallengeParticipant_userId_status_idx" ON "CommunityChallengeParticipant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityChallengeParticipant_challengeId_userId_key" ON "CommunityChallengeParticipant"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "CommunityFriendRequest_addresseeId_status_createdAt_idx" ON "CommunityFriendRequest"("addresseeId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFriendRequest_requesterId_addresseeId_key" ON "CommunityFriendRequest"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "CommunityFriendship_userBId_idx" ON "CommunityFriendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFriendship_userAId_userBId_key" ON "CommunityFriendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "CommunityConversation_lastMessageAt_idx" ON "CommunityConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "CommunityConversationMember_userId_joinedAt_idx" ON "CommunityConversationMember"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityConversationMember_conversationId_userId_key" ON "CommunityConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "CommunityMessage_conversationId_createdAt_idx" ON "CommunityMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityActivityLog_userId_createdAt_idx" ON "CommunityActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityActivityLog_type_createdAt_idx" ON "CommunityActivityLog"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClub" ADD CONSTRAINT "CommunityClub_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubMember" ADD CONSTRAINT "CommunityClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "CommunityClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityClubMember" ADD CONSTRAINT "CommunityClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChallenge" ADD CONSTRAINT "CommunityChallenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChallengeParticipant" ADD CONSTRAINT "CommunityChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CommunityChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityChallengeParticipant" ADD CONSTRAINT "CommunityChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFriendRequest" ADD CONSTRAINT "CommunityFriendRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFriendRequest" ADD CONSTRAINT "CommunityFriendRequest_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFriendship" ADD CONSTRAINT "CommunityFriendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFriendship" ADD CONSTRAINT "CommunityFriendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityConversationMember" ADD CONSTRAINT "CommunityConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunityConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityConversationMember" ADD CONSTRAINT "CommunityConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunityConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityActivityLog" ADD CONSTRAINT "CommunityActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
