// src/placement-tests/dto/generate-placement-test.dto.ts
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GeneratePlacementTestDto {
  @IsOptional()
  @IsIn(['LEVEL_BASED', 'ADAPTIVE'])
  mode?: 'LEVEL_BASED' | 'ADAPTIVE';

  @IsOptional()
  @IsIn(['Beginner', 'A1', 'A2', 'B1'])
  level?: 'Beginner' | 'A1' | 'A2' | 'B1';

  @IsOptional()
  @IsString()
  goal?: string;
}