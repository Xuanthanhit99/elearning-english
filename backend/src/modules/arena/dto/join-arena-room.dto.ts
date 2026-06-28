import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinArenaRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  password?: string;
}
