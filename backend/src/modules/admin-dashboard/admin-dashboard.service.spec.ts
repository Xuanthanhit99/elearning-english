import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { AuthSessionService } from 'src/modules/auth/auth-session.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { CacheMetricsService } from 'src/common/cache/cache-metrics.service';
import { FeatureFlagsService } from 'src/modules/feature-flags/feature-flags.service';
import { AiUsageService } from 'src/modules/ai-usage/ai-usage.service';
import { QueueAdminService } from 'src/modules/queue-admin/queue-admin.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const prismaMock = {
    user: { findUnique: jest.fn(), count: jest.fn() },
    featureFlag: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const auditLogMock = { record: jest.fn() };
  const authSessionMock = {
    banUser: jest.fn(),
    unbanUser: jest.fn(),
    suspendUser: jest.fn(),
  };
  const redisCacheMock = { isAvailable: jest.fn() };
  const cacheMetricsMock = { snapshot: jest.fn() };
  const featureFlagsMock = { listAll: jest.fn(), setEnabled: jest.fn() };
  const aiUsageMock = { getSummary: jest.fn() };
  const queueAdminMock = {
    getAllQueueCounts: jest.fn(),
    listFailedJobs: jest.fn(),
    retryJob: jest.fn(),
    removeJob: jest.fn(),
    pauseQueue: jest.fn(),
    resumeQueue: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    redisCacheMock.isAvailable.mockReturnValue(true);
    cacheMetricsMock.snapshot.mockReturnValue({});
    prismaMock.user.count.mockResolvedValue(5); // plenty of admins by default

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: AuthSessionService, useValue: authSessionMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
        { provide: CacheMetricsService, useValue: cacheMetricsMock },
        { provide: FeatureFlagsService, useValue: featureFlagsMock },
        { provide: AiUsageService, useValue: aiUsageMock },
        { provide: QueueAdminService, useValue: queueAdminMock },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyUserAction — BAN', () => {
    it('calls authSessionService.banUser (immediate revocation) after flipping status', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'STUDENT',
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'user-1',
              role: 'STUDENT',
              status: UserStatus.BANNED,
              xp: 0,
            }),
          },
        }),
      );
      jest.spyOn(service as any, 'record').mockResolvedValue(undefined);
      jest.spyOn(service, 'getUserProfile').mockResolvedValue({ id: 'user-1' } as any);

      await service.applyUserAction(
        'user-1',
        { action: 'BAN' } as any,
        { id: 'admin-1' },
      );

      expect(authSessionMock.banUser).toHaveBeenCalledWith('user-1');
      expect(authSessionMock.unbanUser).not.toHaveBeenCalled();
    });

    it('calls authSessionService.unbanUser on UNBAN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'STUDENT',
        status: UserStatus.BANNED,
        xp: 0,
      });
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'user-1',
              role: 'STUDENT',
              status: UserStatus.ACTIVE,
              xp: 0,
            }),
          },
        }),
      );
      jest.spyOn(service as any, 'record').mockResolvedValue(undefined);
      jest.spyOn(service, 'getUserProfile').mockResolvedValue({ id: 'user-1' } as any);

      await service.applyUserAction(
        'user-1',
        { action: 'UNBAN' } as any,
        { id: 'admin-1' },
      );

      expect(authSessionMock.unbanUser).toHaveBeenCalledWith('user-1');
      expect(authSessionMock.banUser).not.toHaveBeenCalled();
    });
  });

  describe('applyUserAction — last-admin protection', () => {
    it('rejects banning the only remaining admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.user.count.mockResolvedValue(1);

      await expect(
        service.applyUserAction('admin-2', { action: 'BAN' } as any, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects demoting the only remaining admin via ASSIGN_ROLE', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.user.count.mockResolvedValue(1);

      await expect(
        service.applyUserAction(
          'admin-2',
          { action: 'ASSIGN_ROLE', role: UserRole.STUDENT } as any,
          { id: 'admin-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows demoting an admin when other admins still exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'admin-2',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.user.count.mockResolvedValue(2);
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'admin-2',
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
              xp: 0,
            }),
          },
        }),
      );
      jest.spyOn(service as any, 'record').mockResolvedValue(undefined);
      jest.spyOn(service, 'getUserProfile').mockResolvedValue({ id: 'admin-2' } as any);

      await expect(
        service.applyUserAction(
          'admin-2',
          { action: 'ASSIGN_ROLE', role: UserRole.STUDENT } as any,
          { id: 'admin-1' },
        ),
      ).resolves.toBeDefined();
    });

    it('does not block ASSIGN_ROLE when promoting to ADMIN, even with 1 admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-2',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.user.count.mockResolvedValue(1);
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'user-2',
              role: UserRole.ADMIN,
              status: UserStatus.ACTIVE,
              xp: 0,
            }),
          },
        }),
      );
      jest.spyOn(service as any, 'record').mockResolvedValue(undefined);
      jest.spyOn(service, 'getUserProfile').mockResolvedValue({ id: 'user-2' } as any);

      await expect(
        service.applyUserAction(
          'user-2',
          { action: 'ASSIGN_ROLE', role: UserRole.ADMIN } as any,
          { id: 'admin-1' },
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('applyUserAction — SUSPEND', () => {
    it('requires suspendHours', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'STUDENT',
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({ user: { update: jest.fn() } }),
      );

      await expect(
        service.applyUserAction('user-1', { action: 'SUSPEND' } as any, { id: 'admin-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls authSessionService.suspendUser with a computed expiry and records the reason', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'STUDENT',
        status: UserStatus.ACTIVE,
        xp: 0,
      });
      prismaMock.$transaction.mockImplementation(async (callback: any) =>
        callback({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'user-1',
              role: 'STUDENT',
              status: UserStatus.SUSPENDED,
              xp: 0,
            }),
          },
        }),
      );
      const recordSpy = jest.spyOn(service as any, 'record').mockResolvedValue(undefined);
      jest.spyOn(service, 'getUserProfile').mockResolvedValue({ id: 'user-1' } as any);

      await service.applyUserAction(
        'user-1',
        { action: 'SUSPEND', suspendHours: 24, reason: 'spam' } as any,
        { id: 'admin-1' },
      );

      expect(authSessionMock.suspendUser).toHaveBeenCalledWith('user-1', expect.any(Date));
      expect(recordSpy).toHaveBeenCalledWith(
        { id: 'admin-1' },
        'admin.user.suspend',
        expect.arrayContaining(['status', 'suspendedUntil']),
        expect.objectContaining({ reason: 'spam' }),
      );
    });
  });
});
