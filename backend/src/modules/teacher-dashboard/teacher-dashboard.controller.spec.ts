import { Test, TestingModule } from '@nestjs/testing';
import { TeacherDashboardController } from './teacher-dashboard.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';

describe('TeacherDashboardController', () => {
  let controller: TeacherDashboardController;

  const serviceMock = { getRevenue: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherDashboardController],
      providers: [{ provide: TeacherDashboardService, useValue: serviceMock }],
    }).compile();

    controller = module.get<TeacherDashboardController>(
      TeacherDashboardController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getRevenue delegates to the service using the authenticated teacher id', () => {
    serviceMock.getRevenue.mockReturnValue({ totalRevenue: 0 });

    const result = controller.getRevenue({ user: { id: 'teacher-1' } });

    expect(serviceMock.getRevenue).toHaveBeenCalledWith('teacher-1');
    expect(result).toEqual({ totalRevenue: 0 });
  });
});
