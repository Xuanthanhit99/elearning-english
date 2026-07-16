import { Module } from '@nestjs/common';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { LearningXpListener } from './learning-xp.listener';
import { LearningXpPublisher } from './learning-xp.publisher';

@Module({
  imports: [LeaderboardModule],
  providers: [LearningXpListener, LearningXpPublisher],
  exports: [LearningXpPublisher],
})
export class LearningXpModule {}
