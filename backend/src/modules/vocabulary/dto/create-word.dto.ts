import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWordDto {
  @IsString()
  word: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsString()
  audio?: string;

  @IsOptional()
  @IsString()
  partOfSpeech?: string;

  @IsOptional()
  @IsString()
  meaningVi?: string;

  @IsOptional()
  @IsString()
  meaningEn?: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsArray()
  synonyms?: string[];

  @IsOptional()
  @IsArray()
  antonyms?: string[];

  @IsString()
  level: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  difficulty?: number;

  @IsOptional()
  @IsString()
  topicId?: string;
}
