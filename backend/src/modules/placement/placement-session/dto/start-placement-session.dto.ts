import { CefrLevel, ModeType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class StartPlacementSessionDto {
  @IsOptional()
  @IsEnum(ModeType)
  mode?: ModeType;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;
}
