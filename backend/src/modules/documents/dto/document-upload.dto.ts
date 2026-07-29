import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

function toBoolean({ value }: { value: unknown }) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return false;
}

function toStringArray({ value }: { value: unknown }): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

// multipart/form-data fields arrive as strings — this DTO is validated
// against `req.body` after Multer has already pulled the file out, so
// every field is `@Transform`ed defensively rather than assumed typed.
export class CreateDocumentUploadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsIn(LEVELS)
  level?: (typeof LEVELS)[number];

  @IsOptional()
  @IsArray()
  @Transform(toStringArray)
  @ArrayMaxSize(10)
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  explanationLanguage?: string;

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
  @IsArray()
  @Transform(toStringArray)
  @ArrayMaxSize(15)
  tags?: string[];

  // Both consents are required — enforced with @Equals(true) rather than
  // just @IsBoolean() so a missing/false value fails validation instead
  // of silently defaulting.
  @Transform(toBoolean)
  @Equals(true, {
    message: 'Bạn phải xác nhận quyền sở hữu tài liệu trước khi tải lên.',
  })
  confirmOwnership!: boolean;

  @Transform(toBoolean)
  @Equals(true, {
    message: 'Bạn phải đồng ý điều khoản cộng đồng trước khi tải lên.',
  })
  agreeToTerms!: boolean;
}
