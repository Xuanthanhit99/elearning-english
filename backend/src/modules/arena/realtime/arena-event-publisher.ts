import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ArenaDomainEvent, ArenaDomainEventInput } from './arena-domain-event';

/*
 * Mirrors NotificationEventPublisher's convention: ArenaService publishes a
 * typed domain event after a mutation commits, and any number of listeners
 * (ArenaRealtimeListener today) react to it — decouples ArenaService from
 * the gateway so there's no gateway<->service circular dependency.
 */
@Injectable()
export class ArenaEventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish(input: ArenaDomainEventInput): ArenaDomainEvent {
    const event: ArenaDomainEvent = {
      ...input,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };
    this.eventEmitter.emit(event.type, event);
    return event;
  }
}
