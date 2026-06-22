import { Test, TestingModule } from '@nestjs/testing';
import { TeacherDashboardController } from './teacher-dashboard.controller';

describe('TeacherDashboardController', () => {
  let controller: TeacherDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherDashboardController],
    }).compile();

    controller = module.get<TeacherDashboardController>(TeacherDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
