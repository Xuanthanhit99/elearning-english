export const ARENA_ROOM_UPDATED = 'arena.room.updated';
export const ARENA_MATCH_STARTED = 'arena.match.started';
export const ARENA_ANSWER_SUBMITTED = 'arena.answer.submitted';
export const ARENA_MATCH_FINISHED = 'arena.match.finished';
// Phase F1 — per-participant progression events (see
// docs/arena-progression-sequence.md §4). Emitted via the same
// `ArenaEventPublisher.publish()` entrypoint as the realtime-only events
// above, so there is exactly one publish mechanism for all Arena domain
// events; the "critical" guarantee for these two comes from every listener
// using `runCriticalEventHandler()` to hand off to a durable BullMQ queue,
// not from the emit/publish call itself (which stays fire-and-forget,
// matching this codebase's established EventEmitter2 convention).
export const ARENA_MATCH_COMPLETED = 'arena.match.completed';
export const ARENA_RATING_CHANGED = 'arena.rating.changed';

export type ArenaDomainEventType =
  | typeof ARENA_ROOM_UPDATED
  | typeof ARENA_MATCH_STARTED
  | typeof ARENA_ANSWER_SUBMITTED
  | typeof ARENA_MATCH_FINISHED
  | typeof ARENA_MATCH_COMPLETED
  | typeof ARENA_RATING_CHANGED;

export type ArenaDomainEvent = {
  type: ArenaDomainEventType;
  roomId: string;
  matchId?: string;
  actorUserId?: string;
  occurredAt: string;
  // Phase F1 progression-event payload — only populated for
  // ARENA_MATCH_COMPLETED/ARENA_RATING_CHANGED, optional so every existing
  // realtime event (and every existing publish() call site) is unaffected.
  userId?: string;
  seasonId?: string | null;
  outcome?: 'WIN' | 'LOSS' | 'DRAW';
  previousMmr?: number;
  nextMmr?: number;
  mmrDelta?: number;
  previousTier?: string;
  nextTier?: string;
  promoted?: boolean;
  demoted?: boolean;
  xpAwarded?: number;
  goldAwarded?: number;
  arenaPointsAwarded?: number;
};

export type ArenaDomainEventInput = Omit<ArenaDomainEvent, 'occurredAt'> & {
  occurredAt?: string;
};
