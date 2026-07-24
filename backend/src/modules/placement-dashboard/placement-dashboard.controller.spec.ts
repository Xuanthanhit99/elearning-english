import { Test, TestingModule } from '@nestjs/testing';
import { PlacementDashboardController } from './placement-dashboard.controller';
import { PlacementDashboardService } from './placement-dashboard.service';

describe('PlacementDashboardController', () => {
  let controller: PlacementDashboardController;

  const serviceMock = {
    getDashboard: jest.fn(),
    getHistory: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementDashboardController],
      providers: [{ provide: PlacementDashboardService, useValue: serviceMock }],
    }).compile();

    controller = module.get<PlacementDashboardController>(
      PlacementDashboardController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getDashboard wraps the service result in a { success, data } envelope for the authenticated user', async () => {
    serviceMock.getDashboard.mockResolvedValue({ overallLevel: 'B1' });

    const result = await controller.getDashboard({
      user: { id: 'user-1' },
    } as any);

    expect(serviceMock.getDashboard).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ success: true, data: { overallLevel: 'B1' } });
  });
});
