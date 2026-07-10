import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AnswerPlacementQuestionDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  spentSeconds?: number;
}
