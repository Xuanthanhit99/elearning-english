import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { AuthSessionService } from 'src/modules/auth/auth-session.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const prismaMock = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const auditLogMock = { record: jest.fn() };
  const authSessionMock = { banUser: jest.fn(), unbanUser: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: AuthSessionService, useValue: authSessionMock },
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
});
