import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCourseLandingDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  subTitle?: string;

  @IsOptional()
  @IsString()
  introVideo?: string;

  @IsOptional()
  @IsArray()
  benefits?: any[];

  @IsOptional()
  @IsArray()
  faq?: any[];
}
