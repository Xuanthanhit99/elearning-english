// src/placement-tests/dto/submit-placement-test.dto.ts
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitPlacementTestDto {
  @IsArray()
  questions: any[];

  @IsObject()
  answers: Record<string, string>;

  @IsOptional()
  @IsIn(['LEVEL_BASED', 'ADAPTIVE'])
  mode?: 'LEVEL_BASED' | 'ADAPTIVE';

  @IsOptional()
  @IsString()
  selectedLevel?: string;
}