import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateQuizDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsArray()
  options: string[];

  @IsNotEmpty()
  @IsString()
  answer: string;
}
