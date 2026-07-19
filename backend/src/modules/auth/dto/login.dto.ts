import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string = '';

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string = '';

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  @IsOptional()
  @IsString()
  recoveryCode?: string;
}
