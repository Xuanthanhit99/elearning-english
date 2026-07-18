// src/modules/speaking/dto/get-speaking-topics.dto.ts

import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetSpeakingTopicsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'popular', 'progress', 'lessons'])
  sort?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value || 1))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value || 10))
  limit?: number = 10;
}
