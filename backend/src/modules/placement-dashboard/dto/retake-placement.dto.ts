import { IsBoolean, IsOptional } from 'class-validator';

export class RetakePlacementDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
