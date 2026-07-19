import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
