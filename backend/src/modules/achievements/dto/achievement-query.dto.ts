import {
  AchievementCategory,
  AchievementRarity,
  AchievementStatus,
} from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AchievementQueryDto {
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;

  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @IsOptional()
  @IsEnum(AchievementStatus)
  status?: AchievementStatus;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
