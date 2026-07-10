import { Test, TestingModule } from '@nestjs/testing';
import { PlacementTestService } from './placement-test.service';

describe('PlacementTestService', () => {
  let service: PlacementTestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementTestService],
    }).compile();

    service = module.get<PlacementTestService>(PlacementTestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
