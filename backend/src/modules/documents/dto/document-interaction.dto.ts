import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentReportReason } from '@prisma/client';

export class RateDocumentDto {
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

const REPORT_REASONS: DocumentReportReason[] = [
  'COPYRIGHT',
  'INAPPROPRIATE_CONTENT',
  'WRONG_INFORMATION',
  'SPAM',
  'MALICIOUS_FILE',
  'PERSONAL_INFORMATION',
  'BROKEN_FILE',
  'OTHER',
];

export class ReportDocumentDto {
  @IsIn(REPORT_REASONS)
  reason!: DocumentReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateMyDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;
}
