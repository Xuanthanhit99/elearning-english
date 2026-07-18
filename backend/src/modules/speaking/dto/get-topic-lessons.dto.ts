// src/modules/speaking/dto/get-topic-lessons.dto.ts

import { IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetTopicLessonsDto {
  @IsOptional()
  @IsIn(['default', 'newest', 'oldest', 'level'])
  sort?: string = 'default';

  @IsOptional()
  @Transform(({ value }) => Number(value || 1))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value || 8))
  limit?: number = 8;
}
