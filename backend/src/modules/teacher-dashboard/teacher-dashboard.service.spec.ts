import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeacherDashboardService } from './teacher-dashboard.service';

describe('TeacherDashboardService', () => {
  let service: TeacherDashboardService;

  const prismaMock = {
    order: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherDashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TeacherDashboardService>(TeacherDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getRevenue sums PAID orders for the teacher into totalRevenue/totalOrders/totalStudents', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        userId: 'student-1',
        amount: 100,
        user: { id: 'student-1', fullname: 'A', email: 'a@test.com' },
        course: { id: 'course-1', title: 'Course 1', price: 100 },
      },
      {
        id: 'order-2',
        userId: 'student-2',
        amount: 50,
        user: { id: 'student-2', fullname: 'B', email: 'b@test.com' },
        course: { id: 'course-1', title: 'Course 1', price: 50 },
      },
    ]);

    const result = await service.getRevenue('teacher-1');

    expect(result.totalRevenue).toBe(150);
    expect(result.totalOrders).toBe(2);
    expect(result.totalStudents).toBe(2);
  });
});
