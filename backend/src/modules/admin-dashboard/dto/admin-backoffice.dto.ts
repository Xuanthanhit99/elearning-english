import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
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
    'RESET_XP',
    'RESET_STREAK',
    'RESET_PLACEMENT',
    'ASSIGN_ROLE',
  ])
  action!:
    | 'BAN'
    | 'UNBAN'
    | 'DEACTIVATE'
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
}

export class AdminContentStatusDto {
  @IsIn(['PUBLISHED', 'DRAFT', 'ARCHIVED', 'APPROVED', 'REJECTED', 'REVIEW'])
  status!: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'APPROVED' | 'REJECTED' | 'REVIEW';

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

export const USER_STATUS_VALUES = Object.values(UserStatus);
export const COURSE_STATUS_VALUES = Object.values(CourseStatus);
