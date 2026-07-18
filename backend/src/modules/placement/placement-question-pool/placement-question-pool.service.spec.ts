import { Test, TestingModule } from '@nestjs/testing';
import { PlacementQuestionPoolService } from './placement-question-pool.service';

describe('PlacementQuestionPoolService', () => {
  let service: PlacementQuestionPoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementQuestionPoolService],
    }).compile();

    service = module.get<PlacementQuestionPoolService>(
      PlacementQuestionPoolService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
