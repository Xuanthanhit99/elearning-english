import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateBuilderOutlineDto {
  @IsNotEmpty()
  @IsObject()
  outline: Record<string, any>;
}
