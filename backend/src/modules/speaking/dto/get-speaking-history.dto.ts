// src/modules/speaking/dto/get-speaking-history.dto.ts

import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetSpeakingHistoryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value || 1))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value || 8))
  limit?: number = 8;
}
