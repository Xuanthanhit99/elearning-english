import { IsIn, IsObject, IsOptional } from 'class-validator';

/**
 * Phase A security hardening: `winnerTeam`/`result` are no longer trusted as
 * the source of truth — the backend always recomputes the winner from
 * `ArenaParticipant.score` in the database. Both fields are kept optional
 * (accepted but ignored) only so any existing caller sending the old shape
 * doesn't get rejected by the global `forbidNonWhitelisted` ValidationPipe.
 */
export class FinishArenaMatchDto {
  @IsOptional()
  @IsIn(['A', 'B'])
  winnerTeam?: 'A' | 'B';

  @IsOptional()
  @IsObject()
  result?: Record<string, any>;
}
