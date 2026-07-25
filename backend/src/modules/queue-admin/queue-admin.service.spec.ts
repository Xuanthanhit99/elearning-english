import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
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

const ALL_QUEUE_NAMES = [
  ACHIEVEMENT_QUEUE,
  ARENA_RATING_DECAY_QUEUE,
  ARENA_RECONCILIATION_QUEUE,
  ARENA_SEASON_LIFECYCLE_QUEUE,
  COMMUNITY_QUEUE,
  LEADERBOARD_WEEKLY_CLOSE_QUEUE,
  LISTENING_GENERATION_QUEUE,
  NOTIFICATIONS_QUEUE,
  PLACEMENT_PROCESSING_QUEUE,
  SPEAKING_PROCESSING_QUEUE,
  WRITING_PROCESSING_QUEUE,
];

describe('QueueAdminService', () => {
  let service: QueueAdminService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      getJobCounts: jest
        .fn()
        .mockResolvedValue({
          waiting: 0,
          active: 0,
          completed: 5,
          failed: 1,
          delayed: 0,
        }),
      isPaused: jest.fn().mockResolvedValue(false),
      getFailed: jest.fn().mockResolvedValue([]),
      getJob: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueAdminService,
        ...ALL_QUEUE_NAMES.map((name) => ({
          provide: getQueueToken(name),
          useValue: mockQueue,
        })),
      ],
    }).compile();

    service = module.get<QueueAdminService>(QueueAdminService);
  });

  describe('getAllQueueCounts', () => {
    it('reports counts for every registered queue', async () => {
      const result = await service.getAllQueueCounts();

      expect(result).toHaveLength(ALL_QUEUE_NAMES.length);
      expect(result[0]).toMatchObject({
        waiting: 0,
        completed: 5,
        failed: 1,
        isPaused: false,
      });
    });
  });

  describe('unknown queue name', () => {
    it('throws NotFoundException instead of a raw undefined-access error', async () => {
      await expect(service.listFailedJobs('not-a-real-queue')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listFailedJobs', () => {
    it('redacts failed job payload data instead of exposing prompts or private content', async () => {
      mockQueue.getFailed.mockResolvedValue([
        {
          id: 'job-1',
          name: 'generate-feedback',
          data: {
            userId: 'user-1',
            prompt: 'private prompt',
            conversationMessages: ['hello'],
            metadata: {
              module: 'writing',
              content: 'student essay',
              retryCount: 2,
            },
          },
          failedReason: 'Boom',
          attemptsMade: 2,
          timestamp: 123,
        },
      ]);

      const result = await service.listFailedJobs(ACHIEVEMENT_QUEUE);

      expect(result[0]).toMatchObject({
        id: 'job-1',
        name: 'generate-feedback',
        data: {
          userId: '[REDACTED]',
          prompt: '[REDACTED]',
          conversationMessages: '[REDACTED]',
          metadata: {
            module: '[REDACTED]',
            content: '[REDACTED]',
            retryCount: 2,
          },
        },
        failedReason: 'Boom',
        attemptsMade: 2,
        timestamp: 123,
      });
    });
  });

  describe('retryJob', () => {
    it('throws NotFoundException when the job does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(
        service.retryJob(ACHIEVEMENT_QUEUE, 'job-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('retries an existing job', async () => {
      const jobMock = { retry: jest.fn().mockResolvedValue(undefined) };
      mockQueue.getJob.mockResolvedValue(jobMock);

      const result = await service.retryJob(ACHIEVEMENT_QUEUE, 'job-1');

      expect(jobMock.retry).toHaveBeenCalled();
      expect(result).toEqual({ retried: true });
    });
  });

  describe('removeJob', () => {
    it('refuses to remove a job that is not in the failed state', async () => {
      const jobMock = {
        getState: jest.fn().mockResolvedValue('active'),
        remove: jest.fn(),
      };
      mockQueue.getJob.mockResolvedValue(jobMock);

      await expect(
        service.removeJob(ACHIEVEMENT_QUEUE, 'job-1'),
      ).rejects.toThrow(BadRequestException);
      expect(jobMock.remove).not.toHaveBeenCalled();
    });

    it('removes a failed job', async () => {
      const jobMock = {
        getState: jest.fn().mockResolvedValue('failed'),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      mockQueue.getJob.mockResolvedValue(jobMock);

      const result = await service.removeJob(ACHIEVEMENT_QUEUE, 'job-1');

      expect(jobMock.remove).toHaveBeenCalled();
      expect(result).toEqual({ removed: true });
    });
  });

  describe('pause/resume', () => {
    it('pauses and resumes a known queue', async () => {
      await expect(service.pauseQueue(ACHIEVEMENT_QUEUE)).resolves.toEqual({
        paused: true,
      });
      expect(mockQueue.pause).toHaveBeenCalled();

      await expect(service.resumeQueue(ACHIEVEMENT_QUEUE)).resolves.toEqual({
        paused: false,
      });
      expect(mockQueue.resume).toHaveBeenCalled();
    });
  });
});
