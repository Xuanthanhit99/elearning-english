// src/modules/tts/dto/synthesize-speech.dto.ts
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  text: string;

  @IsOptional()
  @IsIn(['en', 'vi'])
  lang?: 'en' | 'vi';
}
