import { IsOptional, IsString } from 'class-validator';

export class GenerateBuilderContentDto {
  @IsOptional()
  @IsString()
  lessonId?: string;
}
