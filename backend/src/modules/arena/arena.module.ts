import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArenaController } from './arena.controller';
import { ArenaService } from './arena.service';
import { ArenaCookieAuthService } from './realtime/arena-cookie-auth.service';
import { ArenaEventPublisher } from './realtime/arena-event-publisher';
import { ArenaGateway } from './realtime/arena.gateway';
import { ArenaPresenceService } from './realtime/arena-presence.service';
import { ArenaRealtimeListener } from './realtime/arena-realtime-listener.service';
import { ArenaRedisService } from './realtime/arena-redis.service';
import { ArenaBattleEngineService } from './battle/arena-battle-engine.service';
import { ArenaBattleStateService } from './battle/arena-battle-state.service';
import { ArenaBattleEventService } from './battle/arena-battle-event.service';
import { ArenaPowerUpService } from './battle/arena-power-up.service';
import { ArenaAiQuestionSource } from './question/arena-ai-question-source';
import { ArenaQuestionFallbackSource } from './question/arena-question-fallback-source';
import { ArenaQuestionHistoryService } from './question/arena-question-history.service';
import { ArenaQuestionPipelineService } from './question/arena-question-pipeline.service';
import { ArenaSeasonService } from './progression/arena-season.service';
import { ArenaProgressionDispatcherService } from './progression/arena-progression-dispatcher.service';
import { ArenaNotificationListener } from './progression/arena-notification.listener';
import { ArenaReconciliationService } from './progression/arena-reconciliation.service';
import { ArenaReconciliationScheduler } from './progression/arena-reconciliation.scheduler';
import { ArenaReconciliationProcessor } from './progression/arena-reconciliation.processor';
import { ARENA_RECONCILIATION_QUEUE } from './progression/arena-reconciliation.constants';
import { ArenaRatingDecayService } from './progression/arena-rating-decay.service';
import { ArenaRatingDecayScheduler } from './progression/arena-rating-decay.scheduler';
import { ArenaRatingDecayProcessor } from './progression/arena-rating-decay.processor';
import { ARENA_RATING_DECAY_QUEUE } from './progression/arena-rating-decay.constants';
import { ArenaSeasonLifecycleScheduler } from './progression/arena-season-lifecycle.scheduler';
import { ArenaSeasonLifecycleProcessor } from './progression/arena-season-lifecycle.processor';
import { ARENA_SEASON_LIFECYCLE_QUEUE } from './progression/arena-season-lifecycle.constants';
import { ArenaRateLimiterService } from './rate-limit/arena-rate-limiter.service';

@Module({
  imports: [
    JwtModule.register({}),
    LeaderboardModule,
    NotificationsModule,
    BullModule.registerQueue({ name: ARENA_RECONCILIATION_QUEUE }),
    BullModule.registerQueue({ name: ARENA_RATING_DECAY_QUEUE }),
    BullModule.registerQueue({ name: ARENA_SEASON_LIFECYCLE_QUEUE }),
  ],
  controllers: [ArenaController],
  providers: [
    ArenaService,
    ArenaCookieAuthService,
    ArenaEventPublisher,
    ArenaGateway,
    ArenaPresenceService,
    ArenaRealtimeListener,
    ArenaRedisService,
    ArenaBattleEngineService,
    ArenaBattleStateService,
    ArenaBattleEventService,
    ArenaPowerUpService,
    ArenaAiQuestionSource,
    ArenaQuestionFallbackSource,
    ArenaQuestionHistoryService,
    ArenaQuestionPipelineService,
    ArenaSeasonService,
    ArenaProgressionDispatcherService,
    ArenaNotificationListener,
    ArenaReconciliationService,
    ArenaReconciliationScheduler,
    ArenaReconciliationProcessor,
    ArenaRatingDecayService,
    ArenaRatingDecayScheduler,
    ArenaRatingDecayProcessor,
    ArenaSeasonLifecycleScheduler,
    ArenaSeasonLifecycleProcessor,
    ArenaRateLimiterService,
  ],
  exports: [ArenaEventPublisher],
})
export class ArenaModule {}
