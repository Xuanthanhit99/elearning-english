import { Test, TestingModule } from '@nestjs/testing';
import { PlacementDashboardController } from './placement-dashboard.controller';

describe('PlacementDashboardController', () => {
  let controller: PlacementDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementDashboardController],
    }).compile();

    controller = module.get<PlacementDashboardController>(
      PlacementDashboardController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
