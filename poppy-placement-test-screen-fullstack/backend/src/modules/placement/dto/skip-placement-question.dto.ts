import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SkipPlacementQuestionDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  spentSeconds?: number;
}
