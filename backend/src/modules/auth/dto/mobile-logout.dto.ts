import { IsNotEmpty, IsString } from 'class-validator';

export class MobileLogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
