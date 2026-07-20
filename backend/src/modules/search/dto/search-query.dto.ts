import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CefrLevel, LearningSkill } from '@prisma/client';

export enum SearchResultType {
  VOCABULARY_WORD = 'VOCABULARY_WORD',
  VOCABULARY_TOPIC = 'VOCABULARY_TOPIC',
  GRAMMAR_TOPIC = 'GRAMMAR_TOPIC',
  GRAMMAR_LESSON = 'GRAMMAR_LESSON',
  READING_ARTICLE = 'READING_ARTICLE',
  READING_CATEGORY = 'READING_CATEGORY',
  LISTENING_CONTENT = 'LISTENING_CONTENT',
  LISTENING_TOPIC = 'LISTENING_TOPIC',
  SPEAKING_TOPIC = 'SPEAKING_TOPIC',
  SPEAKING_LESSON = 'SPEAKING_LESSON',
  WRITING_TOPIC = 'WRITING_TOPIC',
  WRITING_LESSON = 'WRITING_LESSON',
  COURSE = 'COURSE',
  COMMUNITY_POST = 'COMMUNITY_POST',
  COMMUNITY_CLUB = 'COMMUNITY_CLUB',
}

export enum SearchResultStatus {
  ACCESSIBLE = 'ACCESSIBLE',
  LOCKED = 'LOCKED',
}

export enum SearchSort {
  RELEVANCE = 'RELEVANCE',
  NEWEST = 'NEWEST',
  POPULAR = 'POPULAR',
  LEVEL_ASC = 'LEVEL_ASC',
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? ''))
  q?: string;

  @IsOptional()
  @IsEnum(SearchResultType)
  type?: SearchResultType;

  @IsOptional()
  @IsEnum(LearningSkill)
  skill?: LearningSkill;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @IsOptional()
  @IsEnum(SearchSort)
  sort?: SearchSort;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsInt()
  @Min(0)
  @Max(120)
  offset?: number;
}

export class SearchSuggestionQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? ''))
  q?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 8))
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
