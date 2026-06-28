import { IsString, MaxLength } from 'class-validator';

export class SubmitArenaAnswerDto {
  @IsString()
  @MaxLength(200)
  answer: string;
}
