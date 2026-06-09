import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSectionDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
