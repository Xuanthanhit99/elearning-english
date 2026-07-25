import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_REDIS } from './auth.constants';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  const prismaMock = {
    userDeviceSession: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const redisMock = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    multi: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.userDeviceSession.findMany.mockResolvedValue([]);
    prismaMock.userDeviceSession.updateMany.mockResolvedValue({ count: 0 });
    redisMock.set.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthSessionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AUTH_REDIS, useValue: redisMock },
      ],
    }).compile();

    service = module.get<AuthSessionService>(AuthSessionService);
  });

  describe('suspendUser', () => {
    it('sets the ban marker with a TTL bounded to the suspension window', async () => {
      const until = new Date(Date.now() + 3600_000); // 1 hour out

      await service.suspendUser('user-1', until);

      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('user-1'),
        '1',
        'EX',
        expect.any(Number),
      );
      const ttl = redisMock.set.mock.calls[0][3];
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('invalidates other sessions the same way banUser does', async () => {
      prismaMock.userDeviceSession.findMany.mockResolvedValue([
        { id: 'session-1', refreshTokenId: 'jti-1' },
      ]);

      await service.suspendUser('user-1', new Date(Date.now() + 3600_000));

      expect(redisMock.del).toHaveBeenCalled(); // refresh token pointer removed
      expect(prismaMock.userDeviceSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });
  });

  describe('invalidateAllOtherSessions', () => {
    it('marks revoked sessions with revokedAt in Postgres, not just Redis', async () => {
      prismaMock.userDeviceSession.findMany.mockResolvedValue([
        { id: 'session-1', refreshTokenId: 'jti-1' },
        { id: 'session-2', refreshTokenId: 'jti-2' },
      ]);

      await service.invalidateAllOtherSessions('user-1');

      expect(prismaMock.userDeviceSession.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('does not call updateMany when there is nothing to revoke', async () => {
      prismaMock.userDeviceSession.findMany.mockResolvedValue([]);

      await service.invalidateAllOtherSessions('user-1');

      expect(prismaMock.userDeviceSession.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('isBanned', () => {
    it('fails open (returns false) on a Redis error', async () => {
      redisMock.get.mockRejectedValue(new Error('redis down'));

      await expect(service.isBanned('user-1')).resolves.toBe(false);
    });

    it('returns true when the marker is present', async () => {
      redisMock.get.mockResolvedValue('1');

      await expect(service.isBanned('user-1')).resolves.toBe(true);
    });
  });
});
