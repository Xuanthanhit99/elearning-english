import { LearningSkill, XpSourceType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AwardXpDto {
  @IsString()
  userId!: string;

  @IsEnum(XpSourceType)
  sourceType!: XpSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsInt()
  @Min(-10000)
  @Max(10000)
  baseXp!: number;

  @IsOptional()
  @IsInt()
  @Min(-10000)
  @Max(10000)
  bonusXp?: number;

  @IsString()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
