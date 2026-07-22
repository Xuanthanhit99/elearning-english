import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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

@Module({
  imports: [JwtModule.register({})],
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
  ],
  exports: [ArenaEventPublisher],
})
export class ArenaModule {}
