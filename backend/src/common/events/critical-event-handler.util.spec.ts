import { Logger } from '@nestjs/common';
import { runCriticalEventHandler } from './critical-event-handler.util';

describe('runCriticalEventHandler', () => {
  function fakeLogger() {
    return { error: jest.fn() } as unknown as Logger;
  }

  it('runs the handler and does not log anything on success', async () => {
    const logger = fakeLogger();
    const handler = jest.fn().mockResolvedValue(undefined);

    await runCriticalEventHandler(logger, 'test.event', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('catches a thrown Error and logs it with the event name and stack, instead of propagating', async () => {
    const logger = fakeLogger();
    const error = new Error('queue unavailable');

    await expect(
      runCriticalEventHandler(logger, 'arena.match.completed', async () => {
        throw error;
      }),
    ).resolves.toBeUndefined(); // does not re-throw — this is the whole point

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('arena.match.completed'),
      error.stack,
    );
  });

  it('catches a rejected promise and logs it, still without propagating', async () => {
    const logger = fakeLogger();

    await runCriticalEventHandler(logger, 'notification.domain.event', async () => {
      return Promise.reject(new Error('bullmq add failed'));
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('bullmq add failed'),
      expect.any(String),
    );
  });

  it('handles a non-Error throw without crashing (String(error) fallback, no stack)', async () => {
    const logger = fakeLogger();

    await runCriticalEventHandler(logger, 'weird.event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'just a string';
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('just a string'),
      undefined,
    );
  });
});
