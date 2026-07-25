import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StudyRoomVisibility } from '@prisma/client';

export class CreateStudyRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  topic?: string;

  @IsOptional()
  @IsEnum(StudyRoomVisibility)
  visibility?: StudyRoomVisibility;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  goalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  maxMembers?: number;

  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;
}
