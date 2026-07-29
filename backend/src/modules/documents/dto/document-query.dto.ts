import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const SOURCE_VALUES = ['beaconvie', 'community'] as const;
const SORT_VALUES = [
  'newest',
  'popular',
  'most_downloaded',
  'top_rated',
  'featured',
] as const;

function toBoolean({ value }: { value: unknown }) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

export class DocumentListQueryDto {
  @IsOptional()
  @IsIn(SOURCE_VALUES)
  source?: (typeof SOURCE_VALUES)[number];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  skill?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasAnswerKey?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasAudio?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  allowDownload?: boolean;

  @IsOptional()
  @IsString()
  explanationLanguage?: string;

  @IsOptional()
  @IsIn(SORT_VALUES)
  sort?: (typeof SORT_VALUES)[number];

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 12;
}
