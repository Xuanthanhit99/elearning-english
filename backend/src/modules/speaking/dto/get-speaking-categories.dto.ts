// src/modules/speaking/dto/get-speaking-categories.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class GetSpeakingCategoriesDto {
  @IsOptional()
  @IsString()
  level?: string;
}
