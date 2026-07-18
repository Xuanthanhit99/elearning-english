import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckWritingDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  level?: string;
}
