// src/pronunciation/dto/generate-pronunciation.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class GeneratePronunciationDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  goal?: string;
}
