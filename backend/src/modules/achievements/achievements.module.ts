import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ACHIEVEMENT_QUEUE } from './achievements.constants';
import { AchievementsController } from './achievements.controller';
import { AchievementsListener } from './achievements.listener';
import { ArenaAchievementListener } from './arena-achievement.listener';
import { AchievementsProcessor } from './achievements.processor';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [
    PrismaModule,
    LeaderboardModule,
    NotificationsModule,
    BullModule.registerQueue({ name: ACHIEVEMENT_QUEUE }),
  ],
  controllers: [AchievementsController],
  providers: [
    AchievementsService,
    AchievementsListener,
    ArenaAchievementListener,
    AchievementsProcessor,
  ],
  exports: [AchievementsService],
})
export class AchievementsModule {}
