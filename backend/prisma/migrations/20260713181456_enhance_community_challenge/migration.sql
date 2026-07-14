-- CreateEnum
CREATE TYPE "CommunityChallengeType" AS ENUM ('SPEAKING', 'VOCABULARY', 'LISTENING', 'READING', 'WRITING', 'GRAMMAR', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityChallengeAudience" AS ENUM ('ALL_MEMBERS', 'NEW_MEMBERS', 'A1_A2', 'B1_PLUS');

-- CreateEnum
CREATE TYPE "CommunityChallengeBadge" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');

-- AlterTable
ALTER TABLE "CommunityChallenge" ADD COLUMN     "audience" "CommunityChallengeAudience" NOT NULL DEFAULT 'ALL_MEMBERS',
ADD COLUMN     "badge" "CommunityChallengeBadge" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "challengeType" "CommunityChallengeType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "maxParticipants" INTEGER;
