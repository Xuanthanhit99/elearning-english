import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { LearningSkill } from '@prisma/client';

export enum AnalyticsRange {
  TODAY = 'today',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.SEVEN_DAYS;

  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class ReportQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.THIRTY_DAYS;
}

export class TimelineQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.SEVEN_DAYS;

  /** Only read when range=custom. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Only read when range=custom. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
