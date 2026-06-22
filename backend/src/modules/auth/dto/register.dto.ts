import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty()
  fullName!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
