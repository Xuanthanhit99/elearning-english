import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranscribeSpeakingDto {
  @IsString()
  @IsNotEmpty()
  audioUrl: string;
}

export class EvaluateSpeakingDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
