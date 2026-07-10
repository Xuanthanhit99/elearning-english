import { IsEnum, IsOptional } from 'class-validator';
import { PlacementMode } from './placement.types';

export class StartPlacementTestDto {
  @IsOptional()
  @IsEnum(PlacementMode)
  mode?: PlacementMode;
}
