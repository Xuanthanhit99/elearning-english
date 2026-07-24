import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;

  const serviceMock = {
    getOverview: jest.fn(),
    getRevenue: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [{ provide: AdminDashboardService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getOverview delegates to AdminDashboardService.getOverview', async () => {
    serviceMock.getOverview.mockResolvedValue({ users: 10 });

    const result = await controller.getOverview();

    expect(serviceMock.getOverview).toHaveBeenCalled();
    expect(result).toEqual({ users: 10 });
  });
});
