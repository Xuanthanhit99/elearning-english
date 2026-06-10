import { IsArray } from 'class-validator';

export class SubmitQuizDto {
  @IsArray()
  answers: {
    quizId: string;
    answer: string;
  }[];
}
