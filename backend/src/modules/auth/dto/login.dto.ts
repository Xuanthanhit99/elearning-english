import { IsBoolean, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  email: string = '';

  @IsNotEmpty()
  password: string = '';

  @IsBoolean()
  rememberMe?: boolean;
}
