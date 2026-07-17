import { IsOptional, IsString, Length } from 'class-validator';

export class ConfirmTwoFactorDto {
  @IsString()
  @Length(6, 6)
  otp!: string;
}

export class DisableTwoFactorDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  @IsOptional()
  @IsString()
  recoveryCode?: string;
}
