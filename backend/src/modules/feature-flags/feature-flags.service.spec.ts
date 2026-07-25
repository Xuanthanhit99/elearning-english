import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { FeatureFlagsService } from './feature-flags.service';
import { KNOWN_FEATURE_FLAGS } from './feature-flags.constants';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  const prismaMock = {
    featureFlag: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const redisCacheMock = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.featureFlag.upsert.mockResolvedValue({});
    redisCacheMock.get.mockResolvedValue(null);
    redisCacheMock.set.mockResolvedValue(true);
    redisCacheMock.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisCacheService, useValue: redisCacheMock },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  describe('onModuleInit', () => {
    it('idempotently upserts every known flag, never overwriting isEnabled', async () => {
      await service.onModuleInit();

      expect(prismaMock.featureFlag.upsert).toHaveBeenCalledTimes(
        KNOWN_FEATURE_FLAGS.length,
      );
      const firstCall = prismaMock.featureFlag.upsert.mock.calls[0][0];
      expect(firstCall.update).not.toHaveProperty('isEnabled');
      expect(firstCall.create.isEnabled).toBe(true);
    });
  });

  describe('getPublicFlags', () => {
    it('returns a cached value without hitting the DB', async () => {
      redisCacheMock.get.mockResolvedValue(JSON.stringify({ AI_COACH: false }));

      const flags = await service.getPublicFlags();

      expect(flags).toEqual({ AI_COACH: false });
      expect(prismaMock.featureFlag.findMany).not.toHaveBeenCalled();
    });

    it('falls back to the DB and populates the cache on a cache miss', async () => {
      redisCacheMock.get.mockResolvedValue(null);
      prismaMock.featureFlag.findMany.mockResolvedValue([
        { key: 'AI_COACH', isEnabled: true },
      ]);

      const flags = await service.getPublicFlags();

      expect(flags).toEqual({ AI_COACH: true });
      expect(redisCacheMock.set).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('fails open (returns true) if the flag lookup throws', async () => {
      redisCacheMock.get.mockRejectedValue(new Error('redis down'));
      prismaMock.featureFlag.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.isEnabled('AI_CONVERSATION')).resolves.toBe(true);
    });

    it('returns the real value when the flag is explicitly disabled', async () => {
      redisCacheMock.get.mockResolvedValue(
        JSON.stringify({ AI_CONVERSATION: false }),
      );

      await expect(service.isEnabled('AI_CONVERSATION')).resolves.toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('rejects an unknown flag key', async () => {
      await expect(
        service.setEnabled('NOT_A_REAL_FLAG', true, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.featureFlag.update).not.toHaveBeenCalled();
    });

    it('updates the flag and invalidates the public cache', async () => {
      prismaMock.featureFlag.update.mockResolvedValue({
        key: 'AI_COACH',
        isEnabled: false,
      });

      const result = await service.setEnabled('AI_COACH', false, 'admin-1');

      expect(prismaMock.featureFlag.update).toHaveBeenCalledWith({
        where: { key: 'AI_COACH' },
        data: { isEnabled: false, updatedById: 'admin-1' },
      });
      expect(redisCacheMock.del).toHaveBeenCalled();
      expect(result.isEnabled).toBe(false);
    });
  });
});
