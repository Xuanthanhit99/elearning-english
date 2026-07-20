import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LearningSkill } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SearchSort } from './dto/search-query.dto';
import { SearchRouteRegistry } from './search-route.registry';
import { SearchService } from './search.service';

const prismaMock = {
  userXpProfile: { findUnique: jest.fn() },
  readingSession: { aggregate: jest.fn(), findFirst: jest.fn() },
  listeningSession: { aggregate: jest.fn(), findFirst: jest.fn() },
  speakingSession: { aggregate: jest.fn(), findFirst: jest.fn() },
  writingSession: { aggregate: jest.fn(), findFirst: jest.fn() },
  grammarLessonProgress: { aggregate: jest.fn() },
  userWordProgress: { count: jest.fn() },
  word: { findMany: jest.fn() },
  wordTopic: { findMany: jest.fn() },
  grammarTopic: { findMany: jest.fn() },
  grammarLesson: { findMany: jest.fn() },
  readingArticle: { findMany: jest.fn() },
  readingCategory: { findMany: jest.fn() },
  listeningQuestion: { findMany: jest.fn() },
  speakingTopic: { findMany: jest.fn() },
  speakingLesson: { findMany: jest.fn() },
  writingTopic: { findMany: jest.fn() },
  writingLesson: { findMany: jest.fn() },
  course: { findMany: jest.fn() },
  communityPost: { findMany: jest.fn() },
  communityClub: { findMany: jest.fn() },
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(prismaMock).forEach((delegate) => {
      Object.values(delegate).forEach((fn) =>
        (fn as jest.Mock).mockResolvedValue([]),
      );
    });
    prismaMock.userXpProfile.findUnique.mockResolvedValue(null);
    prismaMock.userWordProgress.count.mockResolvedValue(0);
    prismaMock.readingSession.aggregate.mockResolvedValue({
      _avg: { accuracy: null },
      _count: { id: 0 },
    });
    prismaMock.listeningSession.aggregate.mockResolvedValue({
      _avg: { score: null },
      _count: { id: 0 },
    });
    prismaMock.speakingSession.aggregate.mockResolvedValue({
      _avg: { overallScore: null },
      _count: { id: 0 },
    });
    prismaMock.writingSession.aggregate.mockResolvedValue({
      _avg: { overallScore: null },
      _count: { id: 0 },
    });
    prismaMock.grammarLessonProgress.aggregate.mockResolvedValue({
      _avg: { score: null },
      _count: { id: 0 },
    });
    prismaMock.readingSession.findFirst.mockResolvedValue(null);
    prismaMock.listeningSession.findFirst.mockResolvedValue(null);
    prismaMock.speakingSession.findFirst.mockResolvedValue(null);
    prismaMock.writingSession.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        SearchRouteRegistry,
        { provide: PrismaService, useValue: prismaMock },
        { provide: DashboardService, useValue: { getDashboard: jest.fn() } },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('returns empty results for short or empty queries', async () => {
    await expect(service.search('user-1', { q: ' ' })).resolves.toMatchObject({
      results: [],
      pagination: { hasMore: false },
    });
    await expect(service.search('user-1', { q: 'a' })).resolves.toMatchObject({
      results: [],
    });
  });

  it('rejects overly long queries', async () => {
    await expect(
      service.search('user-1', { q: 'x'.repeat(100) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ranks exact title matches before partial matches', async () => {
    const now = new Date();
    prismaMock.word.findMany.mockResolvedValue([
      {
        id: '1',
        word: 'banana',
        meaningVi: 'chuoi',
        meaningEn: null,
        example: null,
        partOfSpeech: 'noun',
        topic: null,
        level: 'A1',
        searchCount: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '2',
        word: 'banana bread',
        meaningVi: 'banh chuoi',
        meaningEn: null,
        example: null,
        partOfSpeech: 'noun',
        topic: null,
        level: 'A1',
        searchCount: 99,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await service.search('user-1', {
      q: 'banana',
      skill: LearningSkill.VOCABULARY,
      sort: SearchSort.RELEVANCE,
    });

    expect(result.results.map((item) => item.title).slice(0, 2)).toEqual([
      'banana',
      'banana bread',
    ]);
  });
});
