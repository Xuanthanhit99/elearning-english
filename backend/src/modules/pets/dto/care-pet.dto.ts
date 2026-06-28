import { IsIn } from 'class-validator';

export class CarePetDto {
  @IsIn(['feed', 'play', 'rest', 'clean'])
  action: 'feed' | 'play' | 'rest' | 'clean';
}
