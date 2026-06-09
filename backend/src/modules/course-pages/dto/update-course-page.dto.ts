import { IsArray } from 'class-validator';

export class UpdateCoursePageDto {
  @IsArray()
  blocks: any[];
}
