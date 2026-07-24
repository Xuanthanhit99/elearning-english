import { Test, TestingModule } from '@nestjs/testing';
import { WritingService } from './writing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { SkillLevelResolverService } from '../../common/skill-level/skill-level-resolver.service';

describe('WritingService', () => {
  let service: WritingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WritingService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: GeminiService,
          useValue: { generateJson: jest.fn() },
        },
        {
          provide: SkillLevelResolverService,
          useValue: { resolveSkillLevel: jest.fn(), resolveAllSkillLevels: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WritingService>(WritingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
