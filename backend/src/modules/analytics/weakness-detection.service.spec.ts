import { Test, TestingModule } from '@nestjs/testing';
import { LearningSkill } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { WeaknessDetectionService } from './weakness-detection.service';

describe('WeaknessDetectionService', () => {
  let service: WeaknessDetectionService;

  const prismaMock = {
    userWordProgress: { findMany: jest.fn() },
    wordTopic: { findUnique: jest.fn() },
    grammarLessonProgress: { findMany: jest.fn() },
    grammarLesson: { findFirst: jest.fn() },
    readingSession: { findMany: jest.fn() },
    readingArticle: { findFirst: jest.fn() },
    listeningSession: { findMany: jest.fn() },
    speakingSession: { findMany: jest.fn() },
    speakingLesson: { findFirst: jest.fn() },
    writingSession: { findMany: jest.fn() },
    writingLesson: { findFirst: jest.fn() },
  };

  const redisCacheMock = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // No caching by default — force each test through the real computation.
    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);

    prismaMock.userWordProgress.findMany.mockResolvedValue([]);
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([]);
    prismaMock.readingSession.findMany.mockResolvedValue([]);
    prismaMock.listeningSession.findMany.mockResolvedValue([]);
    prismaMock.speakingSession.findMany.mockResolvedValue([]);
    prismaMock.writingSession.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeaknessDetectionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
      ],
    }).compile();

    service = module.get<WeaknessDetectionService>(WeaknessDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns null for every skill when there is no data at all', async () => {
    const report = await service.getWeaknesses('user-1');

    expect(report.overallWeakest).toEqual([]);
    expect(Object.values(report.bySkill).every((item) => item === null)).toBe(
      true,
    );
  });

  it('ignores a topic with fewer than 2 attempts (noise guard)', async () => {
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
      {
        score: 40,
        lesson: { topicId: 't1', topic: { title: 'Present Perfect', slug: 'present-perfect' } },
      },
    ]);

    const report = await service.getWeaknesses('user-1');

    expect(report.bySkill.GRAMMAR).toBeNull();
  });

  it('picks the weakest Grammar topic by accuracy and attaches a recommended lesson', async () => {
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
      {
        score: 40,
        lesson: { topicId: 't1', topic: { title: 'Present Perfect', slug: 'present-perfect' } },
      },
      {
        score: 44,
        lesson: { topicId: 't1', topic: { title: 'Present Perfect', slug: 'present-perfect' } },
      },
      {
        score: 90,
        lesson: { topicId: 't2', topic: { title: 'Articles', slug: 'articles' } },
      },
      {
        score: 92,
        lesson: { topicId: 't2', topic: { title: 'Articles', slug: 'articles' } },
      },
    ]);
    prismaMock.grammarLesson.findFirst.mockResolvedValue({
      id: 'lesson-x',
      title: 'Present Perfect Practice',
    });

    const report = await service.getWeaknesses('user-1');

    expect(report.bySkill.GRAMMAR).toEqual(
      expect.objectContaining({
        skill: LearningSkill.GRAMMAR,
        topic: 'Present Perfect',
        accuracy: 42,
        attempts: 2,
        recommendedLesson: {
          id: 'lesson-x',
          title: 'Present Perfect Practice',
          href: '/grammar/lesson/lesson-x',
        },
      }),
    );
    expect(report.bySkill.GRAMMAR!.reason).toBe(
      'Grammar → Present Perfect → Accuracy 42% → Recommend Lesson: Present Perfect Practice',
    );
  });

  it('groups Listening weaknesses by the flat topic string field', async () => {
    prismaMock.listeningSession.findMany.mockResolvedValue([
      { topic: 'Airport Announcements', total: 10, correct: 3 },
      { topic: 'Airport Announcements', total: 10, correct: 4 },
      { topic: 'Small Talk', total: 10, correct: 9 },
      { topic: 'Small Talk', total: 10, correct: 8 },
    ]);

    const report = await service.getWeaknesses('user-1');

    expect(report.bySkill.LISTENING).toEqual(
      expect.objectContaining({
        skill: LearningSkill.LISTENING,
        topic: 'Airport Announcements',
        accuracy: 35,
        recommendedLesson: expect.objectContaining({
          href: '/listening?topic=Airport%20Announcements',
        }),
      }),
    );
  });

  it('caps overallWeakest at 5 entries sorted ascending by accuracy, even with all 6 skills weak', async () => {
    prismaMock.userWordProgress.findMany.mockResolvedValue([
      { correctCount: 1, wrongCount: 9, word: { topicId: 'wt1', topic: { name: 'Animals', slug: 'animals' } } },
      { correctCount: 1, wrongCount: 9, word: { topicId: 'wt1', topic: { name: 'Animals', slug: 'animals' } } },
    ]);
    prismaMock.grammarLessonProgress.findMany.mockResolvedValue([
      { score: 20, lesson: { topicId: 't1', topic: { title: 'Grammar Weak', slug: 'g' } } },
      { score: 22, lesson: { topicId: 't1', topic: { title: 'Grammar Weak', slug: 'g' } } },
    ]);
    prismaMock.readingSession.findMany.mockResolvedValue([
      { accuracy: 30, article: { categoryId: 'c1', category: { name: 'Reading Weak', slug: 'r' } } },
      { accuracy: 32, article: { categoryId: 'c1', category: { name: 'Reading Weak', slug: 'r' } } },
    ]);
    prismaMock.listeningSession.findMany.mockResolvedValue([
      { topic: 'Listening Weak', total: 10, correct: 8 },
      { topic: 'Listening Weak', total: 10, correct: 8 },
    ]);
    prismaMock.speakingSession.findMany.mockResolvedValue([
      { overallScore: 25, topicId: 's1', topic: { title: 'Speaking Weak', slug: 's' } },
      { overallScore: 27, topicId: 's1', topic: { title: 'Speaking Weak', slug: 's' } },
    ]);
    prismaMock.writingSession.findMany.mockResolvedValue([
      { overallScore: 33, lesson: { topicId: 'w1', topic: { title: 'Writing Weak', slug: 'w' } } },
      { overallScore: 35, lesson: { topicId: 'w1', topic: { title: 'Writing Weak', slug: 'w' } } },
    ]);

    const report = await service.getWeaknesses('user-1');

    expect(report.overallWeakest.length).toBe(5);
    const accuracies = report.overallWeakest.map((item) => item.accuracy);
    expect([...accuracies].sort((a, b) => a - b)).toEqual(accuracies);
  });

  it('reuses a cached report instead of recomputing when present', async () => {
    const cached = {
      generatedAt: new Date().toISOString(),
      overallWeakest: [],
      bySkill: {
        VOCABULARY: null,
        GRAMMAR: null,
        READING: null,
        LISTENING: null,
        SPEAKING: null,
        WRITING: null,
      },
    };
    redisCacheMock.get.mockResolvedValue(JSON.stringify(cached));

    const report = await service.getWeaknesses('user-1');

    expect(report).toEqual(cached);
    expect(prismaMock.grammarLessonProgress.findMany).not.toHaveBeenCalled();
  });
});
