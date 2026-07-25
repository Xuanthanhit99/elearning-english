import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListStudyRoomsDto {
  @IsOptional()
  @IsIn(['WAITING', 'IN_SESSION', 'ENDED'])
  status?: 'WAITING' | 'IN_SESSION' | 'ENDED';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
