import { Test, TestingModule } from '@nestjs/testing';
import { VocabularyService } from './vocabulary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';

describe('VocabularyService', () => {
  let service: VocabularyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: {},
        },
        {
          provide: VocabularyJobService,
          useValue: {},
        },
        {
          provide: MissionV2ProgressService,
          useValue: {},
        },
        {
          provide: LearningXpPublisher,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<VocabularyService>(VocabularyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
