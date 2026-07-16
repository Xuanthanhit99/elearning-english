import { IsInt, IsString, Max, Min } from 'class-validator';

export class AdminAdjustXpDto {
  @IsString()
  userId!: string;

  @IsInt()
  @Min(-10000)
  @Max(10000)
  amount!: number;

  @IsString()
  reason!: string;
}
