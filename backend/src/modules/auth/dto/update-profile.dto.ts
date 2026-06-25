// src/users/dto/update-profile.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  englishLevel?: string;

  @IsOptional()
  @IsString()
  learningGoal?: string;
}