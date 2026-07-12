import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class SubmitPlacementWritingDto {
  @IsString()
  questionId: string;

  @IsString()
  @MinLength(20, {
    message: 'Bài viết phải có ít nhất 20 ký tự.',
  })
  content: string;

  @IsInt()
  @Min(0)
  spentSeconds: number;
}
