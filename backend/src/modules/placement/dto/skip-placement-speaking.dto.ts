import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SkipPlacementSpeakingDto {
  @IsString()
  questionId: string;

  @IsIn(['SKIPPED', 'DEFERRED'], {
    message: 'action phải là SKIPPED hoặc DEFERRED',
  })
  action: 'SKIPPED' | 'DEFERRED';

  @IsOptional()
  @IsInt()
  @Min(0)
  spentSeconds?: number;
}
