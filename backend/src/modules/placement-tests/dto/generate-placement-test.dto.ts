import { IsOptional, IsString } from 'class-validator';

export class GeneratePlacementTestDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  goal?: string;
}