import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ReviewSessionAnswerDto {
  @IsString()
  wordId: string;

  @IsIn(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  quality: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}

export class SubmitReviewSessionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewSessionAnswerDto)
  answers: ReviewSessionAnswerDto[];
}
