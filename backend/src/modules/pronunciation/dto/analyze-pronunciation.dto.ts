// src/pronunciation/dto/analyze-pronunciation.dto.ts
import { IsString } from 'class-validator';

export class AnalyzePronunciationDto {
  @IsString()
  exerciseId: string;
}