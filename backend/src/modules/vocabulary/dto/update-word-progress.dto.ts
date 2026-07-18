import { IsIn } from 'class-validator';

export class UpdateWordProgressDto {
  @IsIn(['NEW', 'LEARNING', 'KNOWN', 'REVIEW'])
  status: 'NEW' | 'LEARNING' | 'KNOWN' | 'REVIEW';
}
