import { IsArray, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommunityCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  media?: Record<string, unknown>[];
}
