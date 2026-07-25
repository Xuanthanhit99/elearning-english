import { IsString, MinLength } from 'class-validator';

export class JoinStudyRoomByCodeDto {
  @IsString()
  @MinLength(1)
  inviteCode!: string;
}
