import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckWordDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsString()
  @IsNotEmpty()
  sourceLanguage: string; //end

  @IsString()
  @IsNotEmpty()
  targetLanguage: string; //end

  @IsOptional()
  @IsString()
  level?: string;
}
