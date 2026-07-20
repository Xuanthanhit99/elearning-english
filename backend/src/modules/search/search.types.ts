import { CefrLevel, LearningSkill } from '@prisma/client';
import { SearchResultStatus, SearchResultType } from './dto/search-query.dto';

export type UnifiedSearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  skill?: LearningSkill | null;
  level?: CefrLevel | null;
  imageUrl?: string | null;
  tags: string[];
  status: SearchResultStatus;
  score: number;
  href: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt?: Date | null;
  popularity?: number;
};

export type LearningRecommendation = {
  id: string;
  type:
    | 'CONTINUE_LEARNING'
    | 'NEXT_LEARNING_PATH_STEP'
    | 'OVERDUE_VOCABULARY_REVIEW'
    | 'WEAK_SKILL_PRACTICE'
    | 'DAILY_GOAL'
    | 'QUICK_PRACTICE'
    | 'RETRY_LOW_SCORE'
    | 'LEVEL_MATCHED_CONTENT'
    | 'EXPLORE_NEW_TOPIC';
  title: string;
  description: string;
  reason: string;
  priority: number;
  skill?: LearningSkill | null;
  level?: CefrLevel | null;
  href: string;
  ctaLabel: string;
  source: string;
};

export type DiscoverySection = {
  id: string;
  title: string;
  description: string;
  items: Array<UnifiedSearchResult | LearningRecommendation>;
};
