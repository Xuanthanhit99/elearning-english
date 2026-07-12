import { Test, TestingModule } from '@nestjs/testing';
import { PlacementDashboardService } from './placement-dashboard.service';

describe('PlacementDashboardService', () => {
  let service: PlacementDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementDashboardService],
    }).compile();

    service = module.get<PlacementDashboardService>(PlacementDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
