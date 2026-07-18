import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningPathService } from './learning-path.service';

describe('LearningPathService', () => {
  let service: LearningPathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<LearningPathService>(LearningPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
