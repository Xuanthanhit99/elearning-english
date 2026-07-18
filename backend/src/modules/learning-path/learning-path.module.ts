import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { LearningPathAccessModule } from '../learning-path-access/learning-path-access.module';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';

@Module({
  imports: [PrismaModule, LeaderboardModule, LearningPathAccessModule],
  controllers: [LearningPathController],
  providers: [LearningPathService],
  exports: [LearningPathService],
})
export class LearningPathModule {}
