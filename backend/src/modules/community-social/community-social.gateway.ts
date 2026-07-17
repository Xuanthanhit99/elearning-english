import { Injectable } from '@nestjs/common';
import { CommunityGateway } from '../community/gateway/community.gateway';

@Injectable()
export class CommunitySocialGateway {
  constructor(private readonly gateway: CommunityGateway) {}

  emitUser(userId: string, event: string, payload: unknown) {
    this.gateway.emitUser(userId, event, payload);
  }

  emitConversation(
    conversationId: string,
    event: string,
    payload: unknown,
  ) {
    this.gateway.emitConversation(conversationId, event, payload);
  }
}
