import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { NotificationCookieAuthService } from '../../notifications/notification-cookie-auth.service';

export type LeaderboardSocketUser = {
  id: string;
  role?: string;
};

@Injectable()
export class LeaderboardCookieAuthService {
  constructor(private readonly socketAuthService: NotificationCookieAuthService) {}

  authenticate(client: Socket): LeaderboardSocketUser {
    return this.socketAuthService.authenticate(client);
  }
}
