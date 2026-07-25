import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CourseStatus, UserRole, UserStatus } from '@prisma/client';

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class AdminUserActionDto {
  @IsIn([
    'BAN',
    'UNBAN',
    'DEACTIVATE',
    'SUSPEND',
    'RESET_XP',
    'RESET_STREAK',
    'RESET_PLACEMENT',
    'ASSIGN_ROLE',
  ])
  action!:
    | 'BAN'
    | 'UNBAN'
    | 'DEACTIVATE'
    | 'SUSPEND'
    | 'RESET_XP'
    | 'RESET_STREAK'
    | 'RESET_PLACEMENT'
    | 'ASSIGN_ROLE';

  @IsOptional()
  @IsIn(Object.values(UserRole))
  role?: UserRole;

  @IsOptional()
  @IsString()
  reason?: string;

  // Required for SUSPEND — bounded to 90 days so a "temporary" suspend
  // can't accidentally become an unbounded one.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 90)
  suspendHours?: number;
}

export class AdminContentStatusDto {
  @IsIn(['PUBLISHED', 'DRAFT', 'ARCHIVED', 'APPROVED', 'REJECTED', 'REVIEW'])
  status!:
    | 'PUBLISHED'
    | 'DRAFT'
    | 'ARCHIVED'
    | 'APPROVED'
    | 'REJECTED'
    | 'REVIEW';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminModerationActionDto {
  @IsIn(['HIDE', 'RESTORE', 'DELETE', 'ARCHIVE', 'TRANSFER_OWNER'])
  action!: 'HIDE' | 'RESTORE' | 'DELETE' | 'ARCHIVE' | 'TRANSFER_OWNER';

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminFeatureFlagDto {
  @IsBoolean()
  isEnabled!: boolean;
}

export class AdminGamificationToggleDto {
  @IsBoolean()
  isActive!: boolean;
}

export const USER_STATUS_VALUES = Object.values(UserStatus);
export const COURSE_STATUS_VALUES = Object.values(CourseStatus);
