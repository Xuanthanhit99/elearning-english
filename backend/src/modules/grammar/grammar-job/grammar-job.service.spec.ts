import { Test, TestingModule } from '@nestjs/testing';
import { GrammarJobService } from './grammar-job.service';

describe('GrammarJobService', () => {
  let service: GrammarJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrammarJobService],
    }).compile();

    service = module.get<GrammarJobService>(GrammarJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
