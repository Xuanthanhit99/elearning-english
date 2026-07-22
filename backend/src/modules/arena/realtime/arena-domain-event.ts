export const ARENA_ROOM_UPDATED = 'arena.room.updated';
export const ARENA_MATCH_STARTED = 'arena.match.started';
export const ARENA_ANSWER_SUBMITTED = 'arena.answer.submitted';
export const ARENA_MATCH_FINISHED = 'arena.match.finished';

export type ArenaDomainEventType =
  | typeof ARENA_ROOM_UPDATED
  | typeof ARENA_MATCH_STARTED
  | typeof ARENA_ANSWER_SUBMITTED
  | typeof ARENA_MATCH_FINISHED;

export type ArenaDomainEvent = {
  type: ArenaDomainEventType;
  roomId: string;
  matchId?: string;
  actorUserId?: string;
  occurredAt: string;
};

export type ArenaDomainEventInput = Omit<ArenaDomainEvent, 'occurredAt'> & {
  occurredAt?: string;
};
