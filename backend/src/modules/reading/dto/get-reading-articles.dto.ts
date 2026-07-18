import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetReadingArticlesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 8;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsIn(['ALL', 'COMPLETED', 'LEARNING', 'NOT_STARTED'])
  status?: 'ALL' | 'COMPLETED' | 'LEARNING' | 'NOT_STARTED';

  @IsOptional()
  @IsIn(['newest', 'popular', 'xp', 'readTime'])
  sort?: 'newest' | 'popular' | 'xp' | 'readTime';

  @IsOptional()
  @IsString()
  keyword?: string;
}
