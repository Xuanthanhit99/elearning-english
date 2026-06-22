import { Test, TestingModule } from '@nestjs/testing';
import { TeacherDashboardService } from './teacher-dashboard.service';

describe('TeacherDashboardService', () => {
  let service: TeacherDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeacherDashboardService],
    }).compile();

    service = module.get<TeacherDashboardService>(TeacherDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
