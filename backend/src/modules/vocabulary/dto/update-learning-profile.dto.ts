import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLearningProfileDto {
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  dailyWordTarget?: number;
}
