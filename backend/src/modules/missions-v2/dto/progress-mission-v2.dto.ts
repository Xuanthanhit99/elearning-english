import { LearningSkill, MissionV2Action } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProgressMissionV2Dto {
  @IsEnum(MissionV2Action)
  action: MissionV2Action;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  quizId?: string;

  @IsOptional()
  @IsString()
  articleId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  studyMinutes?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
