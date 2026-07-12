import { Test, TestingModule } from '@nestjs/testing';
import { PlacementResultService } from './placement-result.service';

describe('PlacementResultService', () => {
  let service: PlacementResultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementResultService],
    }).compile();

    service = module.get<PlacementResultService>(PlacementResultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
