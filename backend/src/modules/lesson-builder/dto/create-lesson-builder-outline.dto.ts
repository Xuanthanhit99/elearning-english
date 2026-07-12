import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateLessonBuilderOutlineDto {
  @IsNotEmpty()
  @IsString()
  goal: string;

  @IsOptional()
  @IsString()
  audienceAge?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  dailyMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  totalDays?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusSkills?: string[];
}
