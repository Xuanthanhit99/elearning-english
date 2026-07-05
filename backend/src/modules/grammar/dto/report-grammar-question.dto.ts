import { IsOptional, IsString } from 'class-validator';

export class ReportGrammarQuestionDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  note?: string;
}
