import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaModule } from '../../prisma/prisma.module';

import { LeaderboardAdminController } from './leaderboard-admin.controller';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardGateway } from './leaderboard.gateway';
import { LeaderboardProcessor } from './leaderboard.processor';
import { LeaderboardScheduler } from './leaderboard.scheduler';
import { LeaderboardService } from './leaderboard.service';
import { SocialLeaderboardController } from './social-leaderboard.controller';
import { SocialLeaderboardService } from './social-leaderboard.service';
import { XpService } from './xp.service';
import { LEADERBOARD_QUEUE, LEADERBOARD_REDIS } from './leaderboard.constants';
import { LEADERBOARD_WEEKLY_CLOSE_QUEUE } from './backgrount-job/leaderboard-phase3.constants';
import { LeaderboardPhase3AdminController } from './backgrount-job/leaderboard-phase3-admin.controller';
import { LeaderboardRealtimeGateway } from './backgrount-job/leaderboard-realtime.gateway';
import { LeaderboardWeeklyCloseService } from './backgrount-job/leaderboard-weekly-close.service';
import { LeaderboardWeeklyCloseProcessor } from './backgrount-job/leaderboard-weekly-close.processor';
import { LeaderboardWeeklyCloseScheduler } from './backgrount-job/leaderboard-weekly-close.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaderboardRewardSeedService } from './backgrount-job/leaderboard-reward-seed.service';
import { LeaderboardMaintenanceController } from './admin/leaderboard-maintenance.controller';
import { LeaderboardBootstrapService } from './bootstrap/leaderboard-bootstrap.service';
import { LeaderboardMaintenanceScheduler } from './bootstrap/leaderboard-maintenance.scheduler';
import { LeaderboardRewardController } from './rewards/leaderboard-reward.controller';
import { LeaderboardRewardService } from './rewards/leaderboard-reward.service';
import { LeaderboardSocketAuthService } from './socket/leaderboard-socket-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { LeaderboardCookieAuthService } from './socket/leaderboard-cookie-auth.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: LEADERBOARD_QUEUE,
    }),
    BullModule.registerQueue({
      name: LEADERBOARD_WEEKLY_CLOSE_QUEUE,
    }),
    NotificationsModule,
    PrismaModule,
    JwtModule
  ],

  controllers: [
    LeaderboardController,
    LeaderboardAdminController,
    SocialLeaderboardController,
    LeaderboardPhase3AdminController,
    LeaderboardRewardController,
    LeaderboardMaintenanceController,
  ],

  providers: [
    {
      provide: LEADERBOARD_REDIS,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        }),
    },

    LeaderboardGateway,
    LeaderboardService,
    SocialLeaderboardService,
    XpService,
    LeaderboardProcessor,
    LeaderboardScheduler,
    LeaderboardRealtimeGateway,
    LeaderboardWeeklyCloseService,
    LeaderboardWeeklyCloseProcessor,
    LeaderboardWeeklyCloseScheduler,
    LeaderboardGateway,
    LeaderboardRewardSeedService,
    LeaderboardRewardService,
    LeaderboardBootstrapService,
    LeaderboardMaintenanceScheduler,
    LeaderboardSocketAuthService,
    LeaderboardRealtimeGateway,
    LeaderboardCookieAuthService,
  ],

  exports: [
    LeaderboardService,
    SocialLeaderboardService,
    XpService,
    LEADERBOARD_REDIS,
    LeaderboardRealtimeGateway,
    LeaderboardWeeklyCloseService,
    LeaderboardRewardService,
    LeaderboardBootstrapService,
    LeaderboardRealtimeGateway,
  ],
})
export class LeaderboardModule {}
