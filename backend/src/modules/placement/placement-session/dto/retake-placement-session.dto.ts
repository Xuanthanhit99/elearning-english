import { CefrLevel, ModeType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class RetakePlacementSessionDto {
  @IsOptional()
  @IsEnum(ModeType)
  mode?: ModeType;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;
}
