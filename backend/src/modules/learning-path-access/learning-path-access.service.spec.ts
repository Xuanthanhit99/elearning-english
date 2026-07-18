import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningPathAccessService } from './learning-path-access.service';

describe('LearningPathAccessService', () => {
  let service: LearningPathAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathAccessService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<LearningPathAccessService>(LearningPathAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
