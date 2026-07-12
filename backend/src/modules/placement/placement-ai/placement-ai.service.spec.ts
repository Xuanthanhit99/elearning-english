import { Test, TestingModule } from '@nestjs/testing';
import { PlacementAiService } from './placement-ai.service';

describe('PlacementAiService', () => {
  let service: PlacementAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementAiService],
    }).compile();

    service = module.get<PlacementAiService>(PlacementAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
