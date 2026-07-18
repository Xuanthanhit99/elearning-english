// src/modules/reading/dto/get-reading-history.query.ts

import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetReadingHistoryQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 8;

  @IsOptional()
  @IsIn(['ALL', 'COMPLETED', 'IN_PROGRESS', 'FAILED'])
  status?: 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';

  @IsOptional()
  @IsIn(['ALL_TIME', '7_DAYS', '30_DAYS'])
  timeRange?: 'ALL_TIME' | '7_DAYS' | '30_DAYS';
}
