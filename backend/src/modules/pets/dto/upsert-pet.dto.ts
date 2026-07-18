import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertPetDto {
  @IsIn(['cat', 'dog', 'panda', 'fox', 'penguin', 'rabbit'])
  petType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  petName: string;
}
