// src/modules/speaking/dto/submit-speaking-answer.dto.ts

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitSpeakingAnswerDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsString()
  expectedText?: string;

  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}