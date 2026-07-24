import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CefrLevel } from '@prisma/client';

export class StartConversationDto {
  /** If provided, mode/difficulty/system-prompt all come from the scenario
   * catalog. If omitted, `mode` is required and difficulty is resolved
   * adaptively from the user's existing SPEAKING skill radar score (see
   * ConversationService.resolveAdaptiveDifficulty). */
  @IsOptional()
  @IsString()
  scenarioCode?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsEnum(CefrLevel)
  difficulty?: CefrLevel;
}
