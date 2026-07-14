import { CommunityPostType, CommunityPostVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CommunityMediaDto {
  @IsEnum(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT'] as const)
  type!: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  duration?: number;
}

export class CreateCommunityPostDto {
  @IsEnum(CommunityPostType)
  type!: CommunityPostType;

  @IsOptional()
  @IsEnum(CommunityPostVisibility)
  visibility?: CommunityPostVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  level?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CommunityMediaDto)
  media?: CommunityMediaDto[];

  @IsOptional()
  @IsObject()
  pollData?: Record<string, unknown>;
}
