import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Max attempts (including the first) for a Serializable XP transaction before giving up on a persistent conflict. */
export const getXpSerializableRetryMaxAttempts = () =>
  envInt('XP_SERIALIZABLE_RETRY_MAX_ATTEMPTS', 4);

/** Base delay for exponential backoff between retries, in ms — doubles each attempt, plus jitter. */
export const getXpSerializableRetryBaseDelayMs = () =>
  envInt('XP_SERIALIZABLE_RETRY_BASE_DELAY_MS', 25);

const SERIALIZATION_FAILURE_CODE = 'P2034';

/** True for Postgres/Prisma's "could not serialize access due to concurrent update"-class error under Serializable isolation — the one error class safe to blindly retry from scratch. */
export function isSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === SERIALIZATION_FAILURE_CODE
  );
}

/**
 * Wraps a Prisma Serializable-isolation transaction with retry-on-P2034
 * (exponential backoff + jitter). Every other error — including P2002
 * (idempotency-key collision, handled separately by callers) — propagates
 * immediately, unretried: this is specifically a concurrency-conflict
 * retry, not a generic error-recovery mechanism.
 *
 * Safe to wrap around any transaction whose body has no side effects
 * outside the transaction before the point where it would be retried from
 * (true for every current XpService caller — the transaction body only
 * reads/writes via `tx`, nothing external is touched until after it
 * resolves).
 */
export async function withSerializableRetry<T>(
  run: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number; logger?: Logger },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? getXpSerializableRetryMaxAttempts();
  const baseDelayMs = options?.baseDelayMs ?? getXpSerializableRetryBaseDelayMs();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isSerializationFailure(error) || attempt >= maxAttempts) {
        throw error;
      }
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const delay = backoff + Math.random() * baseDelayMs;
      options?.logger?.warn(
        `Serializable transaction conflict (P2034) — retrying attempt ${attempt + 1}/${maxAttempts} after ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }
  // Unreachable (the loop always returns or throws), but keeps TS's control-flow analysis happy.
  throw new Error('withSerializableRetry: exhausted attempts without a terminal return/throw');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
