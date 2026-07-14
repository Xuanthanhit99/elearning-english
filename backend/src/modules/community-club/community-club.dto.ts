import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CommunityClubPrivacy,
  CommunityClubResourceType,
  CommunityPostType,
  CommunityPostVisibility,
} from '@prisma/client';

export class CreateClubDto {
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

export class UpdateClubMemberDto {
  @IsString()
  @IsNotEmpty()
  role!: 'ADMIN' | 'MODERATOR' | 'MEMBER';
}

export class CreateClubPostDto {
  @IsEnum(CommunityPostType)
  type!: CommunityPostType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  media?: unknown;
}

export class CreateClubMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  media?: unknown;
}

export class CreateClubEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;
}

export class CreateClubResourceDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CommunityClubResourceType)
  type!: CommunityClubResourceType;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
