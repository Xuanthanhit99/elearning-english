import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string = '';

  @MinLength(6)
  @MaxLength(128)
  password: string = '';
}
