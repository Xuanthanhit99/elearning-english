import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

function toStringArray({ value }: { value: unknown }): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

export class AdminUpdateDocumentDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsArray() @Transform(toStringArray) skills?: string[];
  @IsOptional() @IsBoolean() allowDownload?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() hasAnswerKey?: boolean;
  @IsOptional() @IsBoolean() hasAudio?: boolean;
}

export class AdminApproveDocumentDto {
  @IsOptional() @IsBoolean() publishImmediately?: boolean = true;
}

export class AdminRejectDocumentDto {
  @IsString() @MaxLength(2000) userFacingReason!: string;
  @IsOptional() @IsString() @MaxLength(2000) internalReason?: string;
  @IsOptional() @IsBoolean() allowResubmission?: boolean = true;
}

export class AdminRequestChangesDto {
  @IsArray() requiredChanges!: string[];
  @IsOptional() @IsString() @MaxLength(2000) userFacingReason?: string;
}

export class AdminCreateOfficialDocumentDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() @MaxLength(100) category!: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsArray() @Transform(toStringArray) skills?: string[];
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  hasAnswerKey?: boolean;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  hasAudio?: boolean;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== false && value !== 'false')
  allowDownload?: boolean;
}

const REPORT_RESOLUTIONS = ['RESOLVED', 'DISMISSED'] as const;
export class AdminResolveReportDto {
  @IsIn(REPORT_RESOLUTIONS)
  status!: (typeof REPORT_RESOLUTIONS)[number];
  @IsOptional() @IsString() @MaxLength(2000) resolution?: string;
}
