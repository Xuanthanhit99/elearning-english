import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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

const SENSITIVE_PAYLOAD_KEY_PATTERN =
  /(authorization|cookie|secret|token|password|prompt|response|content|transcript|conversation|message|text|answer|audio|image|url|email|phone|name)/i;

/**
 * Real BullMQ introspection — replaces admin-dashboard's `getQueueSummary`,
 * which despite its name never actually talked to BullMQ (it proxied three
 * unrelated DB-tracked job tables instead). Registers the SAME queue names
 * every producing/consuming module already uses (BullModule.registerQueue
 * is safe to call again for an existing queue name — it's just another
 * connection to the same Redis-backed queue, not a duplicate), so this
 * reads real, live state rather than re-deriving anything.
 */
@Injectable()
export class QueueAdminService {
  private readonly queues: Record<string, Queue>;

  constructor(
    @InjectQueue(ACHIEVEMENT_QUEUE) achievement: Queue,
    @InjectQueue(ARENA_RATING_DECAY_QUEUE) arenaRatingDecay: Queue,
    @InjectQueue(ARENA_RECONCILIATION_QUEUE) arenaReconciliation: Queue,
    @InjectQueue(ARENA_SEASON_LIFECYCLE_QUEUE) arenaSeasonLifecycle: Queue,
    @InjectQueue(COMMUNITY_QUEUE) community: Queue,
    @InjectQueue(LEADERBOARD_WEEKLY_CLOSE_QUEUE) leaderboardWeeklyClose: Queue,
    @InjectQueue(LISTENING_GENERATION_QUEUE) listeningGeneration: Queue,
    @InjectQueue(NOTIFICATIONS_QUEUE) notifications: Queue,
    @InjectQueue(PLACEMENT_PROCESSING_QUEUE) placementProcessing: Queue,
    @InjectQueue(SPEAKING_PROCESSING_QUEUE) speakingProcessing: Queue,
    @InjectQueue(WRITING_PROCESSING_QUEUE) writingProcessing: Queue,
  ) {
    this.queues = {
      [ACHIEVEMENT_QUEUE]: achievement,
      [ARENA_RATING_DECAY_QUEUE]: arenaRatingDecay,
      [ARENA_RECONCILIATION_QUEUE]: arenaReconciliation,
      [ARENA_SEASON_LIFECYCLE_QUEUE]: arenaSeasonLifecycle,
      [COMMUNITY_QUEUE]: community,
      [LEADERBOARD_WEEKLY_CLOSE_QUEUE]: leaderboardWeeklyClose,
      [LISTENING_GENERATION_QUEUE]: listeningGeneration,
      [NOTIFICATIONS_QUEUE]: notifications,
      [PLACEMENT_PROCESSING_QUEUE]: placementProcessing,
      [SPEAKING_PROCESSING_QUEUE]: speakingProcessing,
      [WRITING_PROCESSING_QUEUE]: writingProcessing,
    };
  }

  private getQueueOrThrow(name: string): Queue {
    const queue = this.queues[name];
    if (!queue) {
      throw new NotFoundException(`Unknown queue: ${name}`);
    }
    return queue;
  }

  async getAllQueueCounts() {
    const names = Object.keys(this.queues);
    const counts = await Promise.all(
      names.map(async (name) => {
        const queue = this.queues[name];
        const [jobCounts, isPaused] = await Promise.all([
          queue.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
          ),
          queue.isPaused(),
        ]);
        return { name, isPaused, ...jobCounts };
      }),
    );
    return counts;
  }

  async listFailedJobs(queueName: string, limit = 20) {
    const queue = this.getQueueOrThrow(queueName);
    const jobs = await queue.getFailed(0, Math.max(0, limit - 1));
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: this.redactJobData(job.data),
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.getQueueOrThrow(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} not found in queue ${queueName}`,
      );
    }
    await job.retry();
    return { retried: true };
  }

  async removeJob(queueName: string, jobId: string) {
    const queue = this.getQueueOrThrow(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} not found in queue ${queueName}`,
      );
    }
    const state = await job.getState();
    if (state !== 'failed') {
      throw new BadRequestException(
        'Only failed jobs can be removed via this endpoint.',
      );
    }
    await job.remove();
    return { removed: true };
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueueOrThrow(queueName);
    await queue.pause();
    return { paused: true };
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueueOrThrow(queueName);
    await queue.resume();
    return { paused: false };
  }

  private redactJobData(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value !== 'object') {
      if (typeof value === 'string') return '[REDACTED]';
      return value;
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        length: value.length,
      };
    }

    if (depth >= 2) {
      return '[REDACTED_OBJECT]';
    }

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_PAYLOAD_KEY_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      result[key] = this.redactJobData(nestedValue, depth + 1);
    }

    return result;
  }
}
