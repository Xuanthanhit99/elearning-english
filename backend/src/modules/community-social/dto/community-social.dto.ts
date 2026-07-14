import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CommunityClubPrivacy, CommunityChallengeStatus, CommunityChallengeAudience, CommunityChallengeType, CommunityChallengeBadge } from '@prisma/client';

export class GetCommunityCommentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class CreateCommunityClubDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsEnum(CommunityClubPrivacy)
  privacy?: CommunityClubPrivacy;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class CreateCommunityChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @IsInt()
  @Min(1)
  target!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardXp?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsEnum(CommunityChallengeType)
  challengeType?: CommunityChallengeType;

  @IsOptional()
  @IsEnum(CommunityChallengeAudience )
  audience?: CommunityChallengeAudience;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @IsOptional()
  @IsEnum(CommunityChallengeBadge)
  badge?: CommunityChallengeBadge;

  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class UpdateChallengeProgressDto {
  @IsInt()
  @Min(0)
  progress!: number;
}

export class SendCommunityMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  media?: unknown;
}

export class SearchCommunityUsersDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
