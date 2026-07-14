/*
  Warnings:

  - The values [POST,WORD] on the enum `CommunityPostType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `CommunityComment` table. All the data in the column will be lost.
  - You are about to drop the column `accuracy` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `aiScore` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `allowListen` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `audioUrl` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `example` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `grammar` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `hashtags` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `ipa` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `meaning` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `memoryTip` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `natural` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `vocabulary` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `wantFeedback` on the `CommunityPost` table. All the data in the column will be lost.
  - You are about to drop the column `word` on the `CommunityPost` table. All the data in the column will be lost.
  - The `visibility` column on the `CommunityPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `authorId` to the `CommunityComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CommunityComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorId` to the `CommunityPost` table without a default value. This is not possible if the table is not empty.
  - Made the column `content` on table `CommunityPost` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CommunityPostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'CLUB', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CommunityPostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE', 'USEFUL', 'GREAT', 'HELPFUL', 'INSPIRED');

-- CreateEnum
CREATE TYPE "CommunityNotificationType" AS ENUM ('POST_REACTION', 'POST_COMMENT', 'COMMENT_REPLY', 'NEW_FOLLOWER', 'POST_MENTION', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "CommunityPostType_new" AS ENUM ('SHARE', 'QUESTION', 'SPEAKING', 'WRITING', 'IMAGE', 'ACHIEVEMENT', 'POLL');
ALTER TABLE "CommunityPost" ALTER COLUMN "type" TYPE "CommunityPostType_new" USING ("type"::text::"CommunityPostType_new");
ALTER TYPE "CommunityPostType" RENAME TO "CommunityPostType_old";
ALTER TYPE "CommunityPostType_new" RENAME TO "CommunityPostType";
DROP TYPE "public"."CommunityPostType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CommunityComment" DROP CONSTRAINT "CommunityComment_postId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityComment" DROP CONSTRAINT "CommunityComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_userId_fkey";

-- AlterTable
ALTER TABLE "CommunityComment" DROP COLUMN "userId",
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "media" JSONB,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "reactionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CommunityPost" DROP COLUMN "accuracy",
DROP COLUMN "aiScore",
DROP COLUMN "allowListen",
DROP COLUMN "audioUrl",
DROP COLUMN "example",
DROP COLUMN "grammar",
DROP COLUMN "hashtags",
DROP COLUMN "imageUrl",
DROP COLUMN "ipa",
DROP COLUMN "meaning",
DROP COLUMN "memoryTip",
DROP COLUMN "natural",
DROP COLUMN "userId",
DROP COLUMN "vocabulary",
DROP COLUMN "wantFeedback",
DROP COLUMN "word",
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "bookmarksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "clubId" TEXT,
ADD COLUMN     "commentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "level" TEXT,
ADD COLUMN     "media" JSONB,
ADD COLUMN     "pollData" JSONB,
ADD COLUMN     "reactionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CommunityPostStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "visibility",
ADD COLUMN     "visibility" "CommunityPostVisibility" NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "content" SET NOT NULL;

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "type" "CommunityNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityReaction_postId_type_idx" ON "CommunityReaction"("postId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_postId_userId_key" ON "CommunityReaction"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityBookmark_userId_createdAt_idx" ON "CommunityBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBookmark_postId_userId_key" ON "CommunityBookmark"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityFollow_followingId_createdAt_idx" ON "CommunityFollow"("followingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFollow_followerId_followingId_key" ON "CommunityFollow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "CommunityNotification_userId_isRead_createdAt_idx" ON "CommunityNotification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_status_visibility_createdAt_idx" ON "CommunityPost"("status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_type_createdAt_idx" ON "CommunityPost"("type", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_score_createdAt_idx" ON "CommunityPost"("score", "createdAt");

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBookmark" ADD CONSTRAINT "CommunityBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFollow" ADD CONSTRAINT "CommunityFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNotification" ADD CONSTRAINT "CommunityNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
