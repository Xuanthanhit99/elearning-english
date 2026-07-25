import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ACHIEVEMENT_QUEUE } from '../achievements/achievements.constants';
import { ARENA_RATING_DECAY_QUEUE } from '../arena/progression/arena-rating-decay.constants';
import { ARENA_RECONCILIATION_QUEUE } from '../arena/progression/arena-reconciliation.constants';
import { ARENA_SEASON_LIFECYCLE_QUEUE } from '../arena/progression/arena-season-lifecycle.constants';
import { COMMUNITY_QUEUE } from '../community/community.constants';
import { LEADERBOARD_WEEKLY_CLOSE_QUEUE } from '../leaderboard/background-job/leaderboard-phase3.constants';
import { LISTENING_GENERATION_QUEUE } from '../listening-job/listening-job.constants';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.constants';
import { PLACEMENT_PROCESSING_QUEUE } from '../placement-processing/placement-processing.module';
import { SPEAKING_PROCESSING_QUEUE } from '../speaking-processing/speaking-processing.constants';
import { WRITING_PROCESSING_QUEUE } from '../writing/writing-processing.constants';
import { QueueAdminService } from './queue-admin.service';

// Registering an existing queue NAME again here is safe — BullMQ/NestJS
// just hands back another connection to the same Redis-backed queue, not a
// second independent one. This module deliberately owns no producers/
// consumers of its own, only read/ops access for the admin console.
@Module({
  imports: [
    BullModule.registerQueue(
      { name: ACHIEVEMENT_QUEUE },
      { name: ARENA_RATING_DECAY_QUEUE },
      { name: ARENA_RECONCILIATION_QUEUE },
      { name: ARENA_SEASON_LIFECYCLE_QUEUE },
      { name: COMMUNITY_QUEUE },
      { name: LEADERBOARD_WEEKLY_CLOSE_QUEUE },
      { name: LISTENING_GENERATION_QUEUE },
      { name: NOTIFICATIONS_QUEUE },
      { name: PLACEMENT_PROCESSING_QUEUE },
      { name: SPEAKING_PROCESSING_QUEUE },
      { name: WRITING_PROCESSING_QUEUE },
    ),
  ],
  providers: [QueueAdminService],
  exports: [QueueAdminService],
})
export class QueueAdminModule {}
