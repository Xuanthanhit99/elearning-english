import { Test, TestingModule } from '@nestjs/testing';
import { VocabularyJobService } from './vocabulary-job.service';

describe('VocabularyJobService', () => {
  let service: VocabularyJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VocabularyJobService],
    }).compile();

    service = module.get<VocabularyJobService>(VocabularyJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
