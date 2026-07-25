import { Module } from '@nestjs/common';
import { RealtimeRedisService } from './realtime-redis.service';
import { PresenceService } from './presence.service';

@Module({
  providers: [RealtimeRedisService, PresenceService],
  exports: [PresenceService],
})
export class RealtimePresenceModule {}
