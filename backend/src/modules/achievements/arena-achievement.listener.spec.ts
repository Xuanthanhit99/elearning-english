import { Queue } from 'bullmq';
import { ArenaAchievementListener } from './arena-achievement.listener';
import { AchievementJobName } from './achievements.constants';

describe('ArenaAchievementListener', () => {
  const queue = { add: jest.fn() } as unknown as Queue;
  let listener: ArenaAchievementListener;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = new ArenaAchievementListener(queue);
  });

  it('publishes deterministic achievement jobs for a completed Arena match', async () => {
    await listener.handleMatchCompleted({
      eventId: 'evt-1',
      userId: 'user-1',
      roomId: 'room-1',
      matchId: 'match-1',
      outcome: 'WIN',
      occurredAt: '2026-07-23T00:00:00.000Z',
    } as any);

    expect(queue.add).toHaveBeenCalledTimes(3);
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      AchievementJobName.PROCESS_EVENT,
      expect.objectContaining({
        eventId: 'ARENA_MATCH_COMPLETED:match-1:user-1',
        userId: 'user-1',
        sourceId: 'match-1',
      }),
      expect.objectContaining({ jobId: 'ARENA_MATCH_COMPLETED:match-1:user-1' }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      AchievementJobName.PROCESS_EVENT,
      expect.objectContaining({ eventId: 'ARENA_MATCH_WON:match-1:user-1' }),
      expect.objectContaining({ jobId: 'ARENA_MATCH_WON:match-1:user-1' }),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      3,
      AchievementJobName.PROCESS_EVENT,
      expect.objectContaining({ eventId: 'ARENA_REWARD_APPLIED:match-1:user-1' }),
      expect.objectContaining({ jobId: 'ARENA_REWARD_APPLIED:match-1:user-1' }),
    );
  });

  it('uses the same job id on duplicate Arena delivery, leaving deduplication to BullMQ', async () => {
    const event = {
      userId: 'user-1',
      roomId: 'room-1',
      matchId: 'match-1',
      outcome: 'LOSS',
      occurredAt: '2026-07-23T00:00:00.000Z',
    } as any;

    await listener.handleMatchCompleted(event);
    await listener.handleMatchCompleted(event);

    const jobIds = (queue.add as jest.Mock).mock.calls.map((call) => call[2].jobId);
    expect(jobIds).toEqual([
      'ARENA_MATCH_COMPLETED:match-1:user-1',
      'ARENA_REWARD_APPLIED:match-1:user-1',
      'ARENA_MATCH_COMPLETED:match-1:user-1',
      'ARENA_REWARD_APPLIED:match-1:user-1',
    ]);
    expect(new Set(jobIds)).toEqual(
      new Set(['ARENA_MATCH_COMPLETED:match-1:user-1', 'ARENA_REWARD_APPLIED:match-1:user-1']),
    );
  });

  it('does not enqueue rating achievement jobs when rating did not change', async () => {
    await listener.handleRatingChanged({
      userId: undefined,
      matchId: 'match-1',
      occurredAt: '2026-07-23T00:00:00.000Z',
    } as any);

    expect(queue.add).not.toHaveBeenCalled();
  });
});
