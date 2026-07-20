import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { LearningSkill } from '@prisma/client';

export enum UnifiedProgressStatus {
  ALL = 'ALL',
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PASSED = 'PASSED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum ProgressRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
}

export class ProgressHistoryQueryDto {
  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsOptional()
  @IsEnum(UnifiedProgressStatus)
  status?: UnifiedProgressStatus = UnifiedProgressStatus.ALL;

  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsEnum(ProgressRange)
  range?: ProgressRange = ProgressRange.THIRTY_DAYS;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
