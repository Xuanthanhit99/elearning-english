import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isSerializationFailure, withSerializableRetry } from './xp-transaction-retry.util';

function serializationFailure() {
  return new Prisma.PrismaClientKnownRequestError('could not serialize access', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

function uniqueConstraintViolation() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['idempotencyKey'] },
  });
}

describe('isSerializationFailure', () => {
  it('is true only for P2034', () => {
    expect(isSerializationFailure(serializationFailure())).toBe(true);
  });

  it('is false for other Prisma error codes (e.g. P2002)', () => {
    expect(isSerializationFailure(uniqueConstraintViolation())).toBe(false);
  });

  it('is false for a plain non-Prisma error', () => {
    expect(isSerializationFailure(new Error('boom'))).toBe(false);
  });
});

describe('withSerializableRetry', () => {
  it('returns the result on first-attempt success without retrying', async () => {
    const run = jest.fn().mockResolvedValue('ok');
    const result = await withSerializableRetry(run, { maxAttempts: 4, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries on P2034 and succeeds once the conflict clears', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(serializationFailure())
      .mockRejectedValueOnce(serializationFailure())
      .mockResolvedValueOnce('ok-after-retries');

    const result = await withSerializableRetry(run, { maxAttempts: 5, baseDelayMs: 1 });
    expect(result).toBe('ok-after-retries');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('throws immediately without retrying for a non-P2034 error', async () => {
    const run = jest.fn().mockRejectedValue(uniqueConstraintViolation());
    await expect(
      withSerializableRetry(run, { maxAttempts: 5, baseDelayMs: 1 }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('throws immediately for a plain non-Prisma error, no retry', async () => {
    const run = jest.fn().mockRejectedValue(new Error('unrelated failure'));
    await expect(
      withSerializableRetry(run, { maxAttempts: 5, baseDelayMs: 1 }),
    ).rejects.toThrow('unrelated failure');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting maxAttempts on a persistent P2034, surfacing the P2034 error', async () => {
    const run = jest.fn().mockRejectedValue(serializationFailure());
    await expect(
      withSerializableRetry(run, { maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toMatchObject({ code: 'P2034' });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('applies exponential backoff between attempts (delay grows attempt over attempt)', async () => {
    jest.spyOn(global, 'setTimeout');
    const run = jest
      .fn()
      .mockRejectedValueOnce(serializationFailure())
      .mockRejectedValueOnce(serializationFailure())
      .mockResolvedValueOnce('ok');

    await withSerializableRetry(run, { maxAttempts: 5, baseDelayMs: 100 });

    const delays = (global.setTimeout as jest.Mock).mock.calls.map((call) => call[1] as number);
    expect(delays).toHaveLength(2);
    // attempt 1 -> 2: base*2^0 = 100 plus up to 100 jitter => [100,200)
    // attempt 2 -> 3: base*2^1 = 200 plus up to 100 jitter => [200,300)
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[0]).toBeLessThan(200);
    expect(delays[1]).toBeGreaterThanOrEqual(200);
    expect(delays[1]).toBeLessThan(300);

    (global.setTimeout as jest.Mock).mockRestore();
  });

  it('logs a warning on each retry when a logger is provided', async () => {
    const logger = { warn: jest.fn() } as unknown as Logger;
    const run = jest
      .fn()
      .mockRejectedValueOnce(serializationFailure())
      .mockResolvedValueOnce('ok');

    await withSerializableRetry(run, { maxAttempts: 3, baseDelayMs: 1, logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('P2034'));
  });

  it('respects the XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS / BASE_DELAY_MS env fallbacks when options are omitted', async () => {
    const originalAttempts = process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS;
    const originalDelay = process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS;
    process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS = '2';
    process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS = '1';

    const run = jest.fn().mockRejectedValue(serializationFailure());
    await expect(withSerializableRetry(run)).rejects.toMatchObject({ code: 'P2034' });
    expect(run).toHaveBeenCalledTimes(2);

    if (originalAttempts === undefined) delete process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS;
    else process.env.XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS = originalAttempts;
    if (originalDelay === undefined) delete process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS;
    else process.env.XP_SERIALIZABLE_RETRY_BASE_DELAY_MS = originalDelay;
  });
});
