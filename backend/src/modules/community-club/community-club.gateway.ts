import { Injectable } from '@nestjs/common';
import { CommunityGateway } from '../community/gateway/community.gateway';

@Injectable()
export class CommunityClubGateway {
  constructor(private readonly gateway: CommunityGateway) {}

  emitClubMessage(clubId: string, message: unknown) {
    this.gateway.emitClubMessage(clubId, message);
  }

  emitClubMemberUpdated(clubId: string, payload: unknown) {
    this.gateway.emitClubMemberUpdated(clubId, payload);
  }
}
