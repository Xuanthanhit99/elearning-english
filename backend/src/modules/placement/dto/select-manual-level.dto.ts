import { CefrLevel } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SelectManualLevelDto {
  @IsEnum(CefrLevel, {
    message: 'level phải là một trong các giá trị A1, A2, B1, B2, C1, C2',
  })
  level: CefrLevel;
}

