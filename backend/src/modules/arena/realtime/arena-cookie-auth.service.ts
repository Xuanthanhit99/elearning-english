import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { NotificationCookieAuthService } from '../../notifications/notification-cookie-auth.service';

export type ArenaSocketUser = {
  id: string;
  role?: string;
};

@Injectable()
export class ArenaCookieAuthService {
  constructor(private readonly socketAuthService: NotificationCookieAuthService) {}

  authenticate(client: Socket): ArenaSocketUser {
    return this.socketAuthService.authenticate(client);
  }
}
