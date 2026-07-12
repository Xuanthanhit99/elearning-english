import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class SubmitListeningAnswerDto {
  @IsString()
  questionId: string;

  @IsIn(['A', 'B', 'C', 'D'])
  selectedAnswer: string;

  /**
   * Đơn vị: giây.
   */
  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpent: number;

  @IsInt()
  @Min(0)
  @Max(100)
  listenedCount: number;
}
