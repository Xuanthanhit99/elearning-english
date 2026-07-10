import { IsEnum, IsOptional } from 'class-validator';
import { ModeType } from '@prisma/client';

export class StartPlacementTestDto {
  @IsOptional()
  @IsEnum(ModeType, {
    message: 'mode phải là LEVEL_BASED hoặc ADAPTIVE',
  })
  mode?: ModeType;
}
