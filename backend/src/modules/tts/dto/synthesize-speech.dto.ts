// src/modules/tts/dto/synthesize-speech.dto.ts
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SynthesizeSpeechDto {
  @IsString()
  @MinLength(1)
  // Paragraph-length TTS is used by Reading/Pronunciation; keep below provider request limits.
  @MaxLength(3000)
  text: string;

  @IsOptional()
  @IsIn(['en', 'vi'])
  lang?: 'en' | 'vi';
}
