import { api } from "@/src/lib/axios";

export type SearchResultType =
  | "VOCABULARY_WORD"
  | "VOCABULARY_TOPIC"
  | "GRAMMAR_TOPIC"
  | "GRAMMAR_LESSON"
  | "READING_ARTICLE"
  | "READING_CATEGORY"
  | "LISTENING_CONTENT"
  | "LISTENING_TOPIC"
  | "SPEAKING_TOPIC"
  | "SPEAKING_LESSON"
  | "WRITING_TOPIC"
  | "WRITING_LESSON"
  | "COURSE"
  | "COMMUNITY_POST"
  | "COMMUNITY_CLUB";

export type LearningSkill =
  | "VOCABULARY"
  | "GRAMMAR"
  | "READING"
  | "LISTENING"
  | "SPEAKING"
  | "WRITING";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

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
  status: "ACCESSIBLE" | "LOCKED";
  score: number;
  href: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type LearningRecommendation = {
  id: string;
  type: string;
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

export type SearchResponse = {
  query: string;
  normalizedQuery: string;
  results: UnifiedSearchResult[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  partial: boolean;
  failedSources: string[];
};

export type Suggestion = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string | null;
  href: string;
};

export type DiscoverySection = {
  id: string;
  title: string;
  description: string;
  items: Array<UnifiedSearchResult | LearningRecommendation>;
};

type ApiEnvelope<T> = { data?: T; success?: boolean } & T;

function unwrap<T>(payload: ApiEnvelope<T>): T {
  return (payload.data ?? payload) as T;
}

export async function searchContent(params: {
  q?: string;
  type?: SearchResultType | "ALL";
  skill?: LearningSkill | "ALL";
  level?: CefrLevel | "ALL";
  sort?: "RELEVANCE" | "NEWEST" | "POPULAR" | "LEVEL_ASC";
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get("/search", {
    params: {
      ...params,
      type: params.type === "ALL" ? undefined : params.type,
      skill: params.skill === "ALL" ? undefined : params.skill,
      level: params.level === "ALL" ? undefined : params.level,
    },
  });
  return unwrap<SearchResponse>(data);
}

export async function getSearchSuggestions(q: string, limit = 8) {
  const { data } = await api.get("/search/suggestions", {
    params: { q, limit },
  });
  return unwrap<{ query: string; suggestions: Suggestion[] }>(data);
}

export async function getDiscovery() {
  const { data } = await api.get("/discovery");
  return unwrap<{ sections: DiscoverySection[]; generatedAt: string }>(data);
}

export async function getRecommendations() {
  const { data } = await api.get("/recommendations");
  return unwrap<LearningRecommendation[]>(data);
}

export function isRecommendation(
  item: UnifiedSearchResult | LearningRecommendation,
): item is LearningRecommendation {
  return "ctaLabel" in item;
}
