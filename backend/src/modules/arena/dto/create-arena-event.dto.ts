import { IsIn, IsObject } from 'class-validator';

export class CreateArenaEventDto {
  @IsIn(['EMOJI', 'PING', 'CHAT'])
  type: 'EMOJI' | 'PING' | 'CHAT';

  @IsObject()
  payload: Record<string, any>;
}
