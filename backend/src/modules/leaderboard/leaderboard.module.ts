import { BullModule } from '@nestjs/bullmq';
import { Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LEADERBOARD_REDIS } from './leaderboard.constants';
import { LeaderboardMaintenanceController } from './admin/leaderboard-maintenance.controller';
import { LEADERBOARD_WEEKLY_CLOSE_QUEUE } from './background-job/leaderboard-phase3.constants';
import { LeaderboardWeeklyCloseProcessor } from './background-job/leaderboard-weekly-close.processor';
import { LeaderboardWeeklyCloseScheduler } from './background-job/leaderboard-weekly-close.scheduler';
import { LeaderboardWeeklyCloseService } from './background-job/leaderboard-weekly-close.service';
import { LeaderboardBootstrapService } from './bootstrap/leaderboard-bootstrap.service';
import { LeaderboardMaintenanceScheduler } from './bootstrap/leaderboard-maintenance.scheduler';
import { LeaderboardAdminController } from './leaderboard-admin.controller';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardRewardController } from './rewards/leaderboard-reward.controller';
import { LeaderboardRewardService } from './rewards/leaderboard-reward.service';
import { LeaderboardCookieAuthService } from './socket/leaderboard-cookie-auth.service';
import { LeaderboardRealtimeGateway } from './socket/leaderboard-realtime.gateway';
import { SocialLeaderboardController } from './social-leaderboard.controller';
import { SocialLeaderboardService } from './social-leaderboard.service';
import { XpService } from './xp.service';

class LeaderboardRedisClient extends Redis implements OnModuleDestroy {
  constructor() {
    super({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({ name: LEADERBOARD_WEEKLY_CLOSE_QUEUE }),
  ],
  controllers: [
    LeaderboardController,
    SocialLeaderboardController,
    LeaderboardRewardController,
    LeaderboardAdminController,
    LeaderboardMaintenanceController,
  ],
  providers: [
    {
      provide: LEADERBOARD_REDIS,
      useClass: LeaderboardRedisClient,
    },
    LeaderboardCookieAuthService,
    LeaderboardRealtimeGateway,
    LeaderboardService,
    SocialLeaderboardService,
    XpService,
    LeaderboardBootstrapService,
    LeaderboardMaintenanceScheduler,
    LeaderboardRewardService,
    LeaderboardWeeklyCloseService,
    LeaderboardWeeklyCloseProcessor,
    LeaderboardWeeklyCloseScheduler,
  ],
  exports: [LeaderboardService, XpService, LEADERBOARD_REDIS],
})
export class LeaderboardModule {}
