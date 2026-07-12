import { Test, TestingModule } from '@nestjs/testing';
import { LearningPathAccessService } from './learning-path-access.service';

describe('LearningPathAccessService', () => {
  let service: LearningPathAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LearningPathAccessService],
    }).compile();

    service = module.get<LearningPathAccessService>(LearningPathAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
