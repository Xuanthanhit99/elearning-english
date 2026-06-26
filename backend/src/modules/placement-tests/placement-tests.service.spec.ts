import { Test, TestingModule } from '@nestjs/testing';
import { PlacementTestsService } from './placement-tests.service';

describe('PlacementTestsService', () => {
  let service: PlacementTestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementTestsService],
    }).compile();

    service = module.get<PlacementTestsService>(PlacementTestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
