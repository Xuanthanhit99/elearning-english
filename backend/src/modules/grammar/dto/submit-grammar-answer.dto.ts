import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SubmitGrammarAnswerDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsBoolean()
  isSkipped?: boolean;
}
