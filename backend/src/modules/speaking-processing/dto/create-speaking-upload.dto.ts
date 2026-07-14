import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSpeakingUploadDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  expectedText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1800)
  duration?: number;
}
