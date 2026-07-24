import { Test, TestingModule } from '@nestjs/testing';
import { WritingJobService } from './writing-job.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeminiService } from '../../gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';

describe('WritingJobService', () => {
  let service: WritingJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WritingJobService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: { generateJson: jest.fn() },
        },
        {
          provide: QuestionGenerationLockService,
          useValue: { withLock: jest.fn((_key: string, cb: () => unknown) => cb()) },
        },
      ],
    }).compile();

    service = module.get<WritingJobService>(WritingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
