import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationActionUrlBuilder {
  dashboard() {
    return '/dashboard';
  }

  missions() {
    return '/missions';
  }

  achievements() {
    return '/achievements';
  }

  leaderboardRewards() {
    return '/leaderboard/rewards';
  }

  community() {
    return '/community';
  }

  learningPath() {
    return '/learning-path';
  }

  writingHistory() {
    return '/writing/history';
  }

  notifications() {
    return '/notifications';
  }

  arena() {
    return '/arena';
  }

  ensureInternalPath(path: string) {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error('Notification action URL must be an internal path.');
    }

    const lower = path.toLowerCase();
    if (
      lower.startsWith('/javascript:') ||
      lower.startsWith('/data:') ||
      lower.startsWith('/file:')
    ) {
      throw new Error('Notification action URL contains a blocked scheme.');
    }

    return path;
  }
}
