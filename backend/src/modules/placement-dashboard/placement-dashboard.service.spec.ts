import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlacementDashboardService } from './placement-dashboard.service';

describe('PlacementDashboardService', () => {
  let service: PlacementDashboardService;

  const prismaMock = {
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacementDashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PlacementDashboardService>(PlacementDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getDashboard throws NotFoundException for a user that does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.getDashboard('missing-user')).rejects.toThrow(
      NotFoundException,
    );
  });
});
