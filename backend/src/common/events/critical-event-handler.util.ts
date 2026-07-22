import { Logger } from '@nestjs/common';

/**
 * Wraps a "critical event listener" body — typically: enqueueing a BullMQ
 * job in reaction to an EventEmitter2 event — so a thrown/rejected error
 * becomes a logged failure instead of an unhandled promise rejection.
 *
 * EventEmitter2's `emit()` is fire-and-forget from the publisher's side:
 * nothing awaits or catches what a listener's returned promise does (see
 * `docs/arena-progression-sequence.md`'s domain-event standard). Every
 * listener for a "critical" business event — one where silently dropping
 * it is unacceptable (achievement unlocks, notifications, Arena
 * progression side effects) — MUST wrap its body in this helper instead of
 * a bespoke try/catch, so failure handling/logging is consistent
 * everywhere and never accidentally omitted. This mirrors the pattern
 * `AchievementsListener` already used before this helper existed
 * (try/catch + `Logger.error`) — extracted here so it isn't hand-rolled
 * once per listener.
 *
 * This does NOT retry — it only guarantees the failure is observed
 * (logged) rather than silently lost. Retry is the job of whatever durable
 * mechanism the listener hands off to (BullMQ's own `attempts`/`backoff`
 * options on the enqueued job).
 */
export async function runCriticalEventHandler(
  logger: Logger,
  eventName: string,
  handler: () => Promise<void>,
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    logger.error(
      `Critical event handler failed for "${eventName}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
