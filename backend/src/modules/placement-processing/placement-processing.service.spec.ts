import { Test, TestingModule } from '@nestjs/testing';
import { PlacementProcessingService } from './placement-processing.service';

describe('PlacementProcessingService', () => {
  let service: PlacementProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementProcessingService],
    }).compile();

    service = module.get<PlacementProcessingService>(PlacementProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
