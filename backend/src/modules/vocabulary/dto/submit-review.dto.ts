import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReviewAnswerItemDto {
  @IsString()
  wordId: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class SubmitReviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewAnswerItemDto)
  answers: ReviewAnswerItemDto[];
}