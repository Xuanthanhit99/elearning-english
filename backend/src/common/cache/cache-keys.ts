/**
 * Central registry of content-cache keys + TTLs. Kept in one place so the
 * report in docs/production-cache-polish-report.md and this file never
 * drift apart, and so two modules never accidentally collide on a key.
 *
 * TTLs are deliberately short-to-medium: this cache only ever accelerates
 * reads of content Postgres already has (or that a lock-guarded Gemini call
 * just persisted). Nothing here is allowed to outlive its DB row for long
 * enough to matter — worst case is one extra Postgres read after expiry.
 */

export const CacheTtl = {
  /** Static-ish lesson/article detail (grammar, reading, speaking, writing). */
  LESSON_DETAIL_SECONDS: 6 * 60 * 60, // 6h
  /** Vocabulary word pool per topic+level — refreshed the moment Gemini adds words. */
  VOCAB_WORD_POOL_SECONDS: 60 * 60, // 1h
  /** Listening question set per level+topic. */
  LISTENING_QUESTIONS_SECONDS: 30 * 60, // 30m
  /** Placement question bank per skill+level+type — shared across every test taker. */
  PLACEMENT_QUESTIONS_SECONDS: 60 * 60, // 1h
  /** Stampede guard for "just checked, not enough content yet" states. */
  NEGATIVE_SECONDS: 20,
} as const;

import { createHash } from 'crypto';

/**
 * Mirrors ListeningService's private `slugify()` + hash-truncate. `topic` is
 * free-text user input (StartListeningDto.topic), same as the existing
 * cold-start Redis lock key — never put raw user input straight into a
 * Redis key namespace. Duplicated intentionally (not imported from
 * ListeningService) so this stays a dependency-free, shared key builder that
 * both the read side (ListeningService) and the write side
 * (ListeningJobProcessor) can use without importing each other.
 */
export const listeningTopicSlug = (topic: string): string => {
  const slug =
    topic
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown';

  return slug.length > 60
    ? createHash('sha1').update(slug).digest('hex').slice(0, 16)
    : slug;
};

export const CacheKeys = {
  grammarLessonDetail: (lessonId: string) => `grammar:lesson:${lessonId}`,
  readingArticleDetail: (slug: string) => `reading:article:${slug}`,
  speakingTopicDetail: (slug: string) => `speaking:topic:${slug}`,
  writingTopicDetail: (slug: string, sort: string) =>
    `writing:topic:${slug}:${sort}`,
  vocabWordPool: (topicId: string, level: string) =>
    `vocabulary:word-pool:${topicId}:${level}`,
  listeningQuestions: (level: string, topic: string) =>
    `listening:questions:${level}:${listeningTopicSlug(topic)}`,
  placementQuestions: (skill: string, level: string, type: string) =>
    `placement:questions:${skill}:${level}:${type}`,
};
