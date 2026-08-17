import { IsNotEmpty, IsString } from 'class-validator';

export class MobileRefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}