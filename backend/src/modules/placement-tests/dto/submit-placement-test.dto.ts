import { IsArray, IsObject } from 'class-validator';

export class SubmitPlacementTestDto {
  @IsArray()
  questions: any[];

  @IsObject()
  answers: Record<string, string>;
}