import {
  CefrLevel,
  LearningSkill,
  PlacementProcessingItemStatus,
} from '@prisma/client';

export type AiPlacementResult = {
  overallLevel: CefrLevel;
  overallScore: number;
  percentile: number;
  confidence: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  projectedLevel: CefrLevel | null;
  projectedWeeksMin: number | null;
  projectedWeeksMax: number | null;
  skills: Array<{
    skill: LearningSkill;
    score: number;
    level: CefrLevel | null;
    status: PlacementProcessingItemStatus;
    label: string;
    rating: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  priorities: Array<{
    skill: LearningSkill;
    priority: number;
    reason: string;
  }>;
  phases: Array<{
    phase: number;
    title: string;
    targetLevel: CefrLevel | null;
    weeksMin: number;
    weeksMax: number;
    description: string;
    objectives: string[];
  }>;
  recommendedCourses: Array<{
    title: string;
    slug: string | null;
    thumbnail: string | null;
    rating: number | null;
    reviews: number | null;
    lessonCount: number | null;
    reason: string;
    order: number;
  }>;
};
