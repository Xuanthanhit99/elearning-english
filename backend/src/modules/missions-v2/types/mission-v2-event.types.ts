import { LearningSkill, MissionV2Action } from '@prisma/client';

export type MissionV2ProgressEvent = {
  userId: string;
  action: MissionV2Action;
  amount?: number;
  skill?: LearningSkill | null;
  lessonId?: string | null;
  quizId?: string | null;
  articleId?: string | null;
  courseId?: string | null;
  studyMinutes?: number | null;
  sourceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};
