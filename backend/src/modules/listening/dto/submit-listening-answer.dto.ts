import { IsInt, IsString, Min } from 'class-validator';

export class SubmitListeningAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  selectedAnswer: string;

  @IsInt()
  @Min(0)
  timeSpent: number;

  @IsInt()
  @Min(0)
  listenedCount: number;
}
