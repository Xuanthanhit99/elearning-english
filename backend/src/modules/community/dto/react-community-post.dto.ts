import { CommunityReactionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ReactCommunityPostDto {
  @IsEnum(CommunityReactionType)
  type!: CommunityReactionType;
}
