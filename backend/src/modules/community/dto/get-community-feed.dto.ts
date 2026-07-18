import { CommunityPostType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetCommunityFeedDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(30)
  limit = 10;

  @IsOptional()
  @IsEnum(CommunityPostType)
  type?: CommunityPostType;

  @IsOptional()
  @IsIn(['FOR_YOU', 'FOLLOWING', 'LATEST', 'POPULAR'])
  tab: 'FOR_YOU' | 'FOLLOWING' | 'LATEST' | 'POPULAR' = 'FOR_YOU';

  @IsOptional()
  @IsString()
  search?: string;
}
