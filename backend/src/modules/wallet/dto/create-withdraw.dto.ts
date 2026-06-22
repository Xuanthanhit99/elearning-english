import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawDto {
  @IsInt()
  @Min(1000)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
