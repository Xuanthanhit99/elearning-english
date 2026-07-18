import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WeeklyTestAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;
}

export class SubmitWeeklyTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyTestAnswerDto)
  answers: WeeklyTestAnswerDto[];
}
