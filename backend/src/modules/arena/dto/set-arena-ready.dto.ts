import { IsBoolean } from 'class-validator';

export class SetArenaReadyDto {
  @IsBoolean()
  ready: boolean;
}
