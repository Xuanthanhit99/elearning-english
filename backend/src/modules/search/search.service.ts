import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CefrLevel,
  CommunityClubPrivacy,
  CommunityPostStatus,
  CommunityPostVisibility,
  CourseStatus,
  LearningSkill,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  SearchQueryDto,
  SearchResultStatus,
  SearchResultType,
  SearchSort,
  SearchSuggestionQueryDto,
} from './dto/search-query.dto';
import { SearchRouteRegistry } from './search-route.registry';
import {
  DiscoverySection,
  LearningRecommendation,
  UnifiedSearchResult,
} from './search.types';

const MAX_QUERY_LENGTH = 80;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 20;
const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly routes: SearchRouteRegistry,
  ) {}

  async search(userId: string, query: SearchQueryDto) {
    const startedAt = Date.now();
    const normalized = this.normalizeQuery(query.q);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;
    const sort = query.sort ?? SearchSort.RELEVANCE;

    if (!normalized) {
      return {
        query: '',
        normalizedQuery: '',
        results: [],
        pagination: { limit, offset, hasMore: false, nextOffset: null },
        partial: false,
        failedSources: [],
      };
    }

    const userContext = await this.getUserContext(userId);
    const sources = await this.collectSearchSources(normalized, query, userContext);
    const filtered = sources
      .filter((item) => this.matchesFilters(item, query))
      .map((item) => ({
        ...item,
        score: item.score + this.personalizationBoost(item, userContext),
      }));

    const sorted = this.sortResults(filtered, sort);
    const results = sorted.slice(offset, offset + limit);

    this.safeLog('search.completed', {
      userId,
      qHash: this.hash(normalized),
      resultCount: sorted.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      query: query.q ?? '',
      normalizedQuery: normalized,
      results,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < sorted.length,
        nextOffset: offset + limit < sorted.length ? offset + limit : null,
      },
      partial: false,
      failedSources: [],
    };
  }

  async suggestions(userId: string, query: SearchSuggestionQueryDto) {
    const normalized = this.normalizeQuery(query.q, { allowEmpty: true });
    const limit = query.limit ?? 8;

    if (normalized && normalized.length < MIN_QUERY_LENGTH) {
      return { query: query.q ?? '', suggestions: [] };
    }

    const results = normalized
      ? (await this.search(userId, {
          q: normalized,
          limit: Math.min(limit * 2, 20),
          offset: 0,
          sort: SearchSort.RELEVANCE,
        })).results
      : await this.popularSuggestionSeeds(limit);

    const seen = new Set<string>();
    const suggestions = results
      .filter((item) => {
        const key = item.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle ?? item.skill ?? item.level ?? null,
        href: item.href,
      }));

    return { query: query.q ?? '', suggestions };
  }

  async discovery(userId: string) {
    const [recommendations, popular, newest, quickPractice] = await Promise.all([
      this.recommendations(userId, 8),
      this.getPopularContent(),
      this.getNewestContent(),
      this.getQuickPractice(),
    ]);

    const sections: DiscoverySection[] = [
      {
        id: 'recommended-for-you',
        title: 'Recommended for you',
        description: 'Built from your current learning data.',
        items: recommendations,
      },
      {
        id: 'popular-this-week',
        title: 'Popular this week',
        description: 'Content with strong learner activity.',
        items: popular,
      },
      {
        id: 'new-content',
        title: 'New content',
        description: 'Recently added active learning content.',
        items: newest,
      },
      {
        id: 'quick-practice',
        title: 'Quick practice',
        description: 'Short activities you can start right away.',
        items: quickPractice,
      },
    ].filter((section) => section.items.length > 0);

    return {
      sections,
      generatedAt: new Date(),
    };
  }

  async recommendations(userId: string, max = 10) {
    const [dashboard, weakSkills, overdueReview, lowScore] = await Promise.all([
      this.dashboard.getDashboard(userId),
      this.getWeakSkills(userId),
      this.getOverdueVocabulary(userId),
      this.getLowScoreRetry(userId),
    ]);

    const recommendations: LearningRecommendation[] = [];

    for (const item of dashboard.continueLearning?.items?.slice(0, 3) ?? []) {
      recommendations.push({
        id: `continue:${item.id}`,
        type: 'CONTINUE_LEARNING',
        title: item.title,
        description: item.subtitle ?? 'Continue your unfinished activity.',
        reason: 'You started this activity recently.',
        priority: 100,
        skill: this.skillFromType(item.type),
        href: item.href,
        ctaLabel: 'Continue',
        source: 'dashboard.continueLearning',
      });
    }

    if (dashboard.recommendedLesson?.href) {
      recommendations.push({
        id: `next:${dashboard.recommendedLesson.href}`,
        type: 'NEXT_LEARNING_PATH_STEP',
        title: dashboard.recommendedLesson.title,
        description:
          dashboard.recommendedLesson.subtitle ?? 'Follow your current learning path.',
        reason: 'This is the next useful step from your learning path.',
        priority: 90,
        skill: this.skillFromType(dashboard.recommendedLesson.type),
        href: dashboard.recommendedLesson.href,
        ctaLabel: 'Start',
        source: 'dashboard.recommendedLesson',
      });
    }

    if (overdueReview.count > 0) {
      recommendations.push({
        id: 'review:vocabulary-overdue',
        type: 'OVERDUE_VOCABULARY_REVIEW',
        title: `Review ${overdueReview.count} vocabulary items`,
        description: 'Some words are due for spaced repetition.',
        reason: 'Vocabulary review is due based on your SRS schedule.',
        priority: 88,
        skill: LearningSkill.VOCABULARY,
        href: '/vocabulary/review',
        ctaLabel: 'Review now',
        source: 'userWordProgress.reviewAt',
      });
    }

    for (const skill of weakSkills.slice(0, 2)) {
      recommendations.push({
        id: `weak:${skill.skill}`,
        type: 'WEAK_SKILL_PRACTICE',
        title: `Practice ${this.skillLabel(skill.skill)}`,
        description: `Your recent average is ${skill.score}%.`,
        reason: 'This skill has enough recent samples and is below target.',
        priority: 80 - skill.score / 10,
        skill: skill.skill,
        href: this.skillHref(skill.skill),
        ctaLabel: 'Practice',
        source: 'recentSkillScores',
      });
    }

    if (lowScore) {
      recommendations.push({
        id: `retry:${lowScore.id}`,
        type: 'RETRY_LOW_SCORE',
        title: `Retry: ${lowScore.title}`,
        description: `Your last score was ${lowScore.score}%.`,
        reason: 'Retrying low-score content helps retention.',
        priority: 76,
        skill: lowScore.skill,
        href: lowScore.href,
        ctaLabel: 'Retry',
        source: 'recentSessions',
      });
    }

    recommendations.push({
      id: 'quick:vocabulary',
      type: 'QUICK_PRACTICE',
      title: 'Quick vocabulary practice',
      description: 'A short practice session to keep your daily rhythm.',
      reason: 'Quick practice is useful when no stronger recommendation exists.',
      priority: 40,
      skill: LearningSkill.VOCABULARY,
      href: '/vocabulary/review',
      ctaLabel: 'Practice',
      source: 'fallback',
    });

    return this.dedupeRecommendations(recommendations)
      .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
      .slice(0, Math.min(Math.max(max, 1), 12));
  }

  private async collectSearchSources(
    q: string,
    query: SearchQueryDto,
    context: { currentLevel: CefrLevel | null; weakSkills: Set<LearningSkill> },
  ): Promise<UnifiedSearchResult[]> {
    const contains = q;
    const sources = await Promise.all([
      this.searchVocabulary(contains),
      this.searchGrammar(contains),
      this.searchReading(contains),
      this.searchListening(contains),
      this.searchSpeaking(contains),
      this.searchWriting(contains),
      this.searchCourses(contains),
      this.searchCommunity(contains),
    ]);

    return sources
      .flat()
      .map((item) => ({
        ...item,
        score:
          item.score +
          (query.level && item.level === query.level ? 5 : 0) +
          (context.currentLevel && item.level === context.currentLevel ? 3 : 0),
      }));
  }

  private async searchVocabulary(q: string): Promise<UnifiedSearchResult[]> {
    const [words, topics] = await Promise.all([
      this.prisma.word.findMany({
        where: {
          OR: [
            { word: { contains: q, mode: 'insensitive' } },
            { meaningVi: { contains: q, mode: 'insensitive' } },
            { meaningEn: { contains: q, mode: 'insensitive' } },
            { example: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { topic: { select: { name: true, slug: true } } },
        take: 20,
        orderBy: [{ searchCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.wordTopic.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return [
      ...words.map((word) =>
        this.result({
          id: word.id,
          type: SearchResultType.VOCABULARY_WORD,
          title: word.word,
          subtitle: word.meaningVi ?? word.meaningEn,
          description: word.example,
          skill: LearningSkill.VOCABULARY,
          level: this.toCefr(word.level),
          tags: [word.partOfSpeech, word.topic?.name].filter(Boolean) as string[],
          href: this.routes.href(SearchResultType.VOCABULARY_WORD, {
            id: word.id,
            slug: word.word,
          }),
          popularity: word.searchCount,
          createdAt: word.createdAt,
          q,
        }),
      ),
      ...topics.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.VOCABULARY_TOPIC,
          title: topic.name,
          subtitle: 'Vocabulary topic',
          description: topic.description,
          skill: LearningSkill.VOCABULARY,
          href: this.routes.href(SearchResultType.VOCABULARY_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q,
        }),
      ),
    ];
  }

  private async searchGrammar(q: string): Promise<UnifiedSearchResult[]> {
    const [topics, lessons] = await Promise.all([
      this.prisma.grammarTopic.findMany({
        where: {
          isActive: true,
          category: { isActive: true },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { category: { select: { title: true } } },
        take: 12,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.grammarLesson.findMany({
        where: {
          isActive: true,
          topic: { isActive: true, category: { isActive: true } },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { topic: { select: { title: true, slug: true, level: true } } },
        take: 12,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return [
      ...topics.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.GRAMMAR_TOPIC,
          title: topic.title,
          subtitle: topic.category.title,
          description: topic.description,
          skill: LearningSkill.GRAMMAR,
          level: this.toCefr(topic.level),
          href: this.routes.href(SearchResultType.GRAMMAR_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q,
        }),
      ),
      ...lessons.map((lesson) =>
        this.result({
          id: lesson.id,
          type: SearchResultType.GRAMMAR_LESSON,
          title: lesson.title,
          subtitle: lesson.topic.title,
          skill: LearningSkill.GRAMMAR,
          level: this.toCefr(lesson.topic.level),
          href: this.routes.href(SearchResultType.GRAMMAR_LESSON, {
            id: lesson.id,
            slug: lesson.slug,
          }),
          createdAt: lesson.createdAt,
          q,
        }),
      ),
    ];
  }

  private async searchReading(q: string): Promise<UnifiedSearchResult[]> {
    const [articles, categories] = await Promise.all([
      this.prisma.readingArticle.findMany({
        where: {
          isPublished: true,
          category: { isActive: true },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { category: { select: { name: true, slug: true } } },
        take: 15,
        orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.readingCategory.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return [
      ...articles.map((article) =>
        this.result({
          id: article.id,
          type: SearchResultType.READING_ARTICLE,
          title: article.title,
          subtitle: article.category.name,
          description: article.description,
          skill: LearningSkill.READING,
          level: this.toCefr(article.level),
          imageUrl: article.thumbnail,
          tags: [article.difficulty],
          href: this.routes.href(SearchResultType.READING_ARTICLE, {
            id: article.id,
            slug: article.slug,
          }),
          popularity: article.viewCount,
          createdAt: article.createdAt,
          q,
        }),
      ),
      ...categories.map((category) =>
        this.result({
          id: category.id,
          type: SearchResultType.READING_CATEGORY,
          title: category.name,
          subtitle: 'Reading category',
          description: category.description,
          skill: LearningSkill.READING,
          imageUrl: category.thumbnail,
          href: this.routes.href(SearchResultType.READING_CATEGORY, {
            id: category.id,
            slug: category.slug,
          }),
          createdAt: category.createdAt,
          q,
        }),
      ),
    ];
  }

  private async searchListening(q: string): Promise<UnifiedSearchResult[]> {
    const questions = await this.prisma.listeningQuestion.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { topic: { contains: q, mode: 'insensitive' } },
          { question: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: { updatedAt: 'desc' },
    });

    return questions.map((item) =>
      this.result({
        id: item.id,
        type: SearchResultType.LISTENING_CONTENT,
        title: item.title || item.question,
        subtitle: item.topic,
        description: 'Listening practice question',
        skill: LearningSkill.LISTENING,
        level: this.toCefr(item.level),
        tags: [item.topic],
        href: this.routes.href(SearchResultType.LISTENING_CONTENT, { id: item.id }),
        createdAt: item.createdAt,
        q,
      }),
    );
  }

  private async searchSpeaking(q: string): Promise<UnifiedSearchResult[]> {
    const [topics, lessons] = await Promise.all([
      this.prisma.speakingTopic.findMany({
        where: {
          isActive: true,
          category: { isActive: true },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { category: { select: { title: true } } },
        take: 12,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.speakingLesson.findMany({
        where: {
          isActive: true,
          topic: { isActive: true, category: { isActive: true } },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { topic: { select: { title: true, slug: true } } },
        take: 12,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return [
      ...topics.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.SPEAKING_TOPIC,
          title: topic.title,
          subtitle: topic.category.title,
          description: topic.description,
          skill: LearningSkill.SPEAKING,
          level: this.toCefr(topic.minLevel),
          imageUrl: topic.imageUrl,
          tags: [topic.difficulty],
          href: this.routes.href(SearchResultType.SPEAKING_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q,
        }),
      ),
      ...lessons.map((lesson) =>
        this.result({
          id: lesson.id,
          type: SearchResultType.SPEAKING_LESSON,
          title: lesson.title,
          subtitle: lesson.topic.title,
          description: lesson.description,
          skill: LearningSkill.SPEAKING,
          level: this.toCefr(lesson.level),
          tags: [lesson.type, lesson.difficulty],
          href: this.routes.href(SearchResultType.SPEAKING_LESSON, {
            id: lesson.id,
            slug: lesson.topic.slug,
          }),
          createdAt: lesson.createdAt,
          q,
        }),
      ),
    ];
  }

  private async searchWriting(q: string): Promise<UnifiedSearchResult[]> {
    const [topics, lessons] = await Promise.all([
      this.prisma.writingTopic.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 12,
        orderBy: [{ learnerCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.writingLesson.findMany({
        where: {
          isActive: true,
          topic: { isActive: true },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { prompt: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { topic: { select: { title: true, slug: true } } },
        take: 12,
        orderBy: [{ learnerCount: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return [
      ...topics.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.WRITING_TOPIC,
          title: topic.title,
          subtitle: topic.category ?? 'Writing topic',
          description: topic.description,
          skill: LearningSkill.WRITING,
          level: this.toCefr(topic.levelText),
          imageUrl: topic.imageUrl,
          tags: [topic.difficulty, topic.category].filter(Boolean) as string[],
          href: this.routes.href(SearchResultType.WRITING_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          popularity: topic.learnerCount,
          createdAt: topic.createdAt,
          q,
        }),
      ),
      ...lessons.map((lesson) =>
        this.result({
          id: lesson.id,
          type: SearchResultType.WRITING_LESSON,
          title: lesson.title,
          subtitle: lesson.topic.title,
          description: lesson.description,
          skill: LearningSkill.WRITING,
          level: this.toCefr(lesson.level),
          imageUrl: lesson.imageUrl,
          tags: [lesson.type],
          href: this.routes.href(SearchResultType.WRITING_LESSON, {
            id: lesson.id,
            slug: lesson.topic.slug,
          }),
          popularity: lesson.learnerCount,
          createdAt: lesson.createdAt,
          q,
        }),
      ),
    ];
  }

  private async searchCourses(q: string): Promise<UnifiedSearchResult[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        status: CourseStatus.APPROVED,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { level: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    return courses.map((course) =>
      this.result({
        id: course.id,
        type: SearchResultType.COURSE,
        title: course.title,
        subtitle: course.level,
        description: course.description,
        imageUrl: course.thumbnail,
        level: this.toCefr(course.level),
        href: this.routes.href(SearchResultType.COURSE, {
          id: course.id,
          slug: course.slug,
        }),
        createdAt: course.createAt,
        q,
      }),
    );
  }

  private async searchCommunity(q: string): Promise<UnifiedSearchResult[]> {
    const [posts, clubs] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: {
          status: CommunityPostStatus.PUBLISHED,
          visibility: CommunityPostVisibility.PUBLIC,
          deletedAt: null,
          club: { is: null },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.communityClub.findMany({
        where: {
          isActive: true,
          privacy: CommunityClubPrivacy.PUBLIC,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return [
      ...posts.map((post) =>
        this.result({
          id: post.id,
          type: SearchResultType.COMMUNITY_POST,
          title: post.title || post.content.slice(0, 80),
          subtitle: post.category ?? 'Community post',
          description: post.content.slice(0, 180),
          tags: post.tags.slice(0, 5),
          href: this.routes.href(SearchResultType.COMMUNITY_POST, { id: post.id }),
          popularity: post.score,
          createdAt: post.createdAt,
          q,
        }),
      ),
      ...clubs.map((club) =>
        this.result({
          id: club.id,
          type: SearchResultType.COMMUNITY_CLUB,
          title: club.name,
          subtitle: 'Community club',
          description: club.description,
          imageUrl: club.coverUrl ?? club.iconUrl,
          tags: club.tags.slice(0, 5),
          href: this.routes.href(SearchResultType.COMMUNITY_CLUB, {
            id: club.id,
            slug: club.slug,
          }),
          popularity: club.memberCount,
          createdAt: club.createdAt,
          q,
        }),
      ),
    ];
  }

  private async popularSuggestionSeeds(limit: number) {
    const [words, articles, topics] = await Promise.all([
      this.prisma.word.findMany({
        take: limit,
        orderBy: [{ searchCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.readingArticle.findMany({
        where: { isPublished: true, category: { isActive: true } },
        take: limit,
        orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.grammarTopic.findMany({
        where: { isActive: true, category: { isActive: true } },
        take: limit,
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return [
      ...words.map((word) =>
        this.result({
          id: word.id,
          type: SearchResultType.VOCABULARY_WORD,
          title: word.word,
          subtitle: word.meaningVi ?? word.meaningEn,
          skill: LearningSkill.VOCABULARY,
          level: this.toCefr(word.level),
          tags: [],
          href: this.routes.href(SearchResultType.VOCABULARY_WORD, {
            id: word.id,
            slug: word.word,
          }),
          popularity: word.searchCount,
          createdAt: word.createdAt,
          q: word.word,
        }),
      ),
      ...articles.map((article) =>
        this.result({
          id: article.id,
          type: SearchResultType.READING_ARTICLE,
          title: article.title,
          subtitle: 'Reading',
          skill: LearningSkill.READING,
          level: this.toCefr(article.level),
          tags: [],
          href: this.routes.href(SearchResultType.READING_ARTICLE, {
            id: article.id,
            slug: article.slug,
          }),
          popularity: article.viewCount,
          createdAt: article.createdAt,
          q: article.title,
        }),
      ),
      ...topics.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.GRAMMAR_TOPIC,
          title: topic.title,
          subtitle: 'Grammar',
          skill: LearningSkill.GRAMMAR,
          level: this.toCefr(topic.level),
          tags: [],
          href: this.routes.href(SearchResultType.GRAMMAR_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q: topic.title,
        }),
      ),
    ];
  }

  private async getPopularContent() {
    const [words, articles, clubs] = await Promise.all([
      this.prisma.word.findMany({
        take: 4,
        orderBy: [{ searchCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.readingArticle.findMany({
        where: { isPublished: true, category: { isActive: true } },
        take: 4,
        orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.communityClub.findMany({
        where: { isActive: true, privacy: CommunityClubPrivacy.PUBLIC },
        take: 3,
        orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    return [
      ...words.map((word) =>
        this.result({
          id: word.id,
          type: SearchResultType.VOCABULARY_WORD,
          title: word.word,
          subtitle: word.meaningVi,
          skill: LearningSkill.VOCABULARY,
          level: this.toCefr(word.level),
          tags: [],
          href: this.routes.href(SearchResultType.VOCABULARY_WORD, {
            id: word.id,
            slug: word.word,
          }),
          popularity: word.searchCount,
          createdAt: word.createdAt,
          q: word.word,
        }),
      ),
      ...articles.map((article) =>
        this.result({
          id: article.id,
          type: SearchResultType.READING_ARTICLE,
          title: article.title,
          subtitle: 'Reading',
          description: article.description,
          skill: LearningSkill.READING,
          level: this.toCefr(article.level),
          imageUrl: article.thumbnail,
          tags: [article.difficulty],
          href: this.routes.href(SearchResultType.READING_ARTICLE, {
            id: article.id,
            slug: article.slug,
          }),
          popularity: article.viewCount,
          createdAt: article.createdAt,
          q: article.title,
        }),
      ),
      ...clubs.map((club) =>
        this.result({
          id: club.id,
          type: SearchResultType.COMMUNITY_CLUB,
          title: club.name,
          subtitle: 'Community club',
          description: club.description,
          imageUrl: club.coverUrl,
          tags: club.tags,
          href: this.routes.href(SearchResultType.COMMUNITY_CLUB, {
            id: club.id,
            slug: club.slug,
          }),
          popularity: club.memberCount,
          createdAt: club.createdAt,
          q: club.name,
        }),
      ),
    ].slice(0, 10);
  }

  private async getNewestContent() {
    const [grammar, writing, speaking] = await Promise.all([
      this.prisma.grammarLesson.findMany({
        where: { isActive: true, topic: { isActive: true, category: { isActive: true } } },
        include: { topic: { select: { title: true, slug: true, level: true } } },
        take: 4,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.writingTopic.findMany({
        where: { isActive: true },
        take: 4,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.speakingTopic.findMany({
        where: { isActive: true, category: { isActive: true } },
        include: { category: { select: { title: true } } },
        take: 4,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return [
      ...grammar.map((lesson) =>
        this.result({
          id: lesson.id,
          type: SearchResultType.GRAMMAR_LESSON,
          title: lesson.title,
          subtitle: lesson.topic.title,
          skill: LearningSkill.GRAMMAR,
          level: this.toCefr(lesson.topic.level),
          tags: [],
          href: this.routes.href(SearchResultType.GRAMMAR_LESSON, {
            id: lesson.id,
            slug: lesson.slug,
          }),
          createdAt: lesson.createdAt,
          q: lesson.title,
        }),
      ),
      ...writing.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.WRITING_TOPIC,
          title: topic.title,
          subtitle: topic.category,
          description: topic.description,
          skill: LearningSkill.WRITING,
          level: this.toCefr(topic.levelText),
          imageUrl: topic.imageUrl,
          tags: [topic.difficulty],
          href: this.routes.href(SearchResultType.WRITING_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q: topic.title,
        }),
      ),
      ...speaking.map((topic) =>
        this.result({
          id: topic.id,
          type: SearchResultType.SPEAKING_TOPIC,
          title: topic.title,
          subtitle: topic.category.title,
          description: topic.description,
          skill: LearningSkill.SPEAKING,
          level: this.toCefr(topic.minLevel),
          imageUrl: topic.imageUrl,
          tags: [topic.difficulty],
          href: this.routes.href(SearchResultType.SPEAKING_TOPIC, {
            id: topic.id,
            slug: topic.slug,
          }),
          createdAt: topic.createdAt,
          q: topic.title,
        }),
      ),
    ].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  private async getQuickPractice() {
    const [listening, reading] = await Promise.all([
      this.prisma.listeningQuestion.findMany({
        where: { isActive: true },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.readingArticle.findMany({
        where: { isPublished: true, category: { isActive: true }, readTime: { lte: 8 } },
        take: 4,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return [
      ...listening.map((item) =>
        this.result({
          id: item.id,
          type: SearchResultType.LISTENING_CONTENT,
          title: item.title || item.question,
          subtitle: item.topic,
          skill: LearningSkill.LISTENING,
          level: this.toCefr(item.level),
          tags: [item.topic],
          href: this.routes.href(SearchResultType.LISTENING_CONTENT, { id: item.id }),
          createdAt: item.createdAt,
          q: item.question,
        }),
      ),
      ...reading.map((article) =>
        this.result({
          id: article.id,
          type: SearchResultType.READING_ARTICLE,
          title: article.title,
          subtitle: `${article.readTime} min`,
          skill: LearningSkill.READING,
          level: this.toCefr(article.level),
          imageUrl: article.thumbnail,
          tags: [article.difficulty],
          href: this.routes.href(SearchResultType.READING_ARTICLE, {
            id: article.id,
            slug: article.slug,
          }),
          createdAt: article.createdAt,
          q: article.title,
        }),
      ),
    ];
  }

  private async getUserContext(userId: string) {
    const [profile, weakSkills] = await Promise.all([
      this.prisma.userXpProfile.findUnique({
        where: { userId },
        select: { currentLevel: true },
      }),
      this.getWeakSkills(userId),
    ]);

    return {
      currentLevel: null,
      weakSkills: new Set(weakSkills.map((item) => item.skill)),
    };
  }

  private async getWeakSkills(userId: string) {
    const [reading, listening, speaking, writing, grammar] = await Promise.all([
      this.prisma.readingSession.aggregate({
        where: { userId, isCompleted: true, completedAt: { not: null } },
        _avg: { accuracy: true },
        _count: { id: true },
      }),
      this.prisma.listeningSession.aggregate({
        where: { userId, completedAt: { not: null } },
        _avg: { score: true },
        _count: { id: true },
      }),
      this.prisma.speakingSession.aggregate({
        where: { userId, finishedAt: { not: null } },
        _avg: { overallScore: true },
        _count: { id: true },
      }),
      this.prisma.writingSession.aggregate({
        where: { userId, isSubmitted: true, submittedAt: { not: null } },
        _avg: { overallScore: true },
        _count: { id: true },
      }),
      this.prisma.grammarLessonProgress.aggregate({
        where: { userId, completed: true },
        _avg: { score: true },
        _count: { id: true },
      }),
    ]);

    return [
      this.skillScore(LearningSkill.READING, reading._avg.accuracy, reading._count.id),
      this.skillScore(LearningSkill.LISTENING, listening._avg.score, listening._count.id),
      this.skillScore(LearningSkill.SPEAKING, speaking._avg.overallScore, speaking._count.id),
      this.skillScore(LearningSkill.WRITING, writing._avg.overallScore, writing._count.id),
      this.skillScore(LearningSkill.GRAMMAR, grammar._avg.score, grammar._count.id),
    ]
      .filter((item): item is { skill: LearningSkill; score: number; sample: number } => Boolean(item))
      .filter((item) => item.sample >= 2 && item.score < 70)
      .sort((a, b) => a.score - b.score);
  }

  private async getOverdueVocabulary(userId: string) {
    const count = await this.prisma.userWordProgress.count({
      where: {
        userId,
        reviewAt: { lte: new Date() },
      },
    });
    return { count };
  }

  private async getLowScoreRetry(userId: string) {
    const [reading, listening, speaking, writing] = await Promise.all([
      this.prisma.readingSession.findFirst({
        where: { userId, isCompleted: true, score: { lt: 70 } },
        include: { article: { select: { title: true, slug: true } } },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.listeningSession.findFirst({
        where: { userId, completedAt: { not: null }, score: { lt: 70 } },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.speakingSession.findFirst({
        where: { userId, finishedAt: { not: null }, overallScore: { lt: 70 } },
        include: { topic: { select: { title: true, slug: true } }, lesson: { select: { title: true } } },
        orderBy: { finishedAt: 'desc' },
      }),
      this.prisma.writingSession.findFirst({
        where: { userId, isSubmitted: true, overallScore: { lt: 70 } },
        include: { lesson: { select: { title: true, topic: { select: { slug: true } } } } },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const candidates = [
      reading && {
        id: reading.id,
        title: reading.article.title,
        score: reading.score,
        skill: LearningSkill.READING,
        href: this.routes.href(SearchResultType.READING_ARTICLE, {
          id: reading.articleId,
          slug: reading.article.slug,
        }),
      },
      listening && {
        id: listening.id,
        title: listening.topic || 'Listening practice',
        score: listening.score,
        skill: LearningSkill.LISTENING,
        href: '/listening',
      },
      speaking && {
        id: speaking.id,
        title: speaking.lesson?.title || speaking.topic?.title || 'Speaking practice',
        score: speaking.overallScore,
        skill: LearningSkill.SPEAKING,
        href: speaking.topic?.slug ? `/speaking/topics/${speaking.topic.slug}` : '/speaking/topics',
      },
      writing && {
        id: writing.id,
        title: writing.lesson.title,
        score: writing.overallScore ?? 0,
        skill: LearningSkill.WRITING,
        href: writing.lesson.topic?.slug ? `/writing/topics/${writing.lesson.topic.slug}` : '/writing/topics',
      },
    ].filter(Boolean) as Array<{
      id: string;
      title: string;
      score: number;
      skill: LearningSkill;
      href: string;
    }>;

    return candidates.sort((a, b) => a.score - b.score)[0] ?? null;
  }

  private result(input: {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    skill?: LearningSkill | null;
    level?: CefrLevel | null;
    imageUrl?: string | null;
    tags?: string[];
    href: string;
    popularity?: number;
    createdAt?: Date | null;
    q: string;
  }): UnifiedSearchResult {
    return {
      id: input.id,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      skill: input.skill ?? null,
      level: input.level ?? null,
      imageUrl: input.imageUrl ?? null,
      tags: input.tags ?? [],
      status: SearchResultStatus.ACCESSIBLE,
      score: this.baseScore(input.title, input.description, input.tags ?? [], input.q),
      href: input.href,
      popularity: input.popularity ?? 0,
      createdAt: input.createdAt ?? null,
      metadata: {
        popularity: input.popularity ?? 0,
      },
    };
  }

  private baseScore(
    title: string,
    description: string | null | undefined,
    tags: string[],
    q: string,
  ) {
    const normalizedTitle = this.normalizeForCompare(title);
    const normalizedQuery = this.normalizeForCompare(q);
    let score = 10;
    if (normalizedTitle === normalizedQuery) score += 100;
    else if (normalizedTitle.startsWith(normalizedQuery)) score += 75;
    else if (normalizedTitle.includes(normalizedQuery)) score += 55;
    if (tags.some((tag) => this.normalizeForCompare(tag).includes(normalizedQuery))) {
      score += 25;
    }
    if (description && this.normalizeForCompare(description).includes(normalizedQuery)) {
      score += 10;
    }
    return score;
  }

  private normalizeQuery(value?: string, options: { allowEmpty?: boolean } = {}) {
    const normalized = String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    if (normalized.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException('Search query is too long.');
    }
    if (!options.allowEmpty && normalized.length < MIN_QUERY_LENGTH) return '';
    return normalized;
  }

  private normalizeForCompare(value: string) {
    return value.normalize('NFKC').trim().toLocaleLowerCase('vi-VN');
  }

  private matchesFilters(item: UnifiedSearchResult, query: SearchQueryDto) {
    if (query.type && item.type !== query.type) return false;
    if (query.skill && item.skill !== query.skill) return false;
    if (query.level && item.level !== query.level) return false;
    return true;
  }

  private personalizationBoost(
    item: UnifiedSearchResult,
    context: { currentLevel: CefrLevel | null; weakSkills: Set<LearningSkill> },
  ) {
    let boost = 0;
    if (item.skill && context.weakSkills.has(item.skill)) boost += 4;
    if (item.level && context.currentLevel && item.level === context.currentLevel) {
      boost += 3;
    }
    return boost;
  }

  private sortResults(items: UnifiedSearchResult[], sort: SearchSort) {
    return [...items].sort((a, b) => {
      if (sort === SearchSort.NEWEST) {
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
      }
      if (sort === SearchSort.POPULAR) {
        return (b.popularity ?? 0) - (a.popularity ?? 0) || b.score - a.score;
      }
      if (sort === SearchSort.LEVEL_ASC) {
        return (CEFR_ORDER[a.level ?? 'A1'] ?? 99) - (CEFR_ORDER[b.level ?? 'A1'] ?? 99);
      }
      return (
        b.score - a.score ||
        (b.popularity ?? 0) - (a.popularity ?? 0) ||
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
        a.id.localeCompare(b.id)
      );
    });
  }

  private toCefr(value?: string | null): CefrLevel | null {
    if (!value) return null;
    const normalized = value.toUpperCase();
    return Object.values(CefrLevel).includes(normalized as CefrLevel)
      ? (normalized as CefrLevel)
      : null;
  }

  private skillScore(skill: LearningSkill, score: number | null, sample: number) {
    if (score === null || Number.isNaN(score)) return null;
    return { skill, score: Math.round(score), sample };
  }

  private skillFromType(value: string): LearningSkill | null {
    const upper = value.toUpperCase();
    return Object.values(LearningSkill).find((skill) => upper.includes(skill)) ?? null;
  }

  private skillLabel(skill: LearningSkill) {
    return skill.charAt(0) + skill.slice(1).toLowerCase();
  }

  private skillHref(skill: LearningSkill) {
    const map: Record<LearningSkill, string> = {
      VOCABULARY: '/vocabulary',
      GRAMMAR: '/grammar',
      LISTENING: '/listening',
      SPEAKING: '/speaking',
      READING: '/reading',
      WRITING: '/writing',
    };
    return map[skill];
  }

  private dedupeRecommendations(items: LearningRecommendation[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.type}:${item.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  private safeLog(event: string, payload: Record<string, unknown>) {
    this.logger.log({ event, ...payload });
  }
}
