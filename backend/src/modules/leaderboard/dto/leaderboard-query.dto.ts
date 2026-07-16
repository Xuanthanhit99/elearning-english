import { LeaderboardPeriodType, LearningSkill, LeagueTier } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(LeaderboardPeriodType)
  period?: LeaderboardPeriodType = LeaderboardPeriodType.WEEKLY;

  @IsOptional()
  @IsEnum(LeagueTier)
  league?: LeagueTier;

  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}
