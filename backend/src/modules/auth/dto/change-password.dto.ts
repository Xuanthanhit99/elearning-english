import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string = '';

  @MinLength(6)
  @MaxLength(128)
  newPassword: string = '';
}
