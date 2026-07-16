import type { LearningActivityCode } from '../learning-xp.constants';

export class LearningActivityCompletedEvent {
  constructor(
    public readonly activity: LearningActivityCode,
    public readonly userId: string,
    public readonly sourceId: string,
    public readonly score?: number | null,
    public readonly completionRate?: number | null,
    public readonly rewardXp?: number | null,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
