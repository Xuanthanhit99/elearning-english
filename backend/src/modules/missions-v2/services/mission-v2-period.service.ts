import { Injectable } from '@nestjs/common';
import { MissionV2Type } from '@prisma/client';

@Injectable()
export class MissionV2PeriodService {
  getPeriod(type: MissionV2Type, now = new Date()) {
    if (type === MissionV2Type.DAILY) {
      const startsAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const expiresAt = new Date(startsAt);
      expiresAt.setDate(expiresAt.getDate() + 1);

      return {
        periodKey: this.toDateKey(startsAt),
        startsAt,
        expiresAt,
      };
    }

    if (type === MissionV2Type.WEEKLY) {
      const startsAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const day = startsAt.getDay() || 7;
      startsAt.setDate(startsAt.getDate() - day + 1);

      const expiresAt = new Date(startsAt);
      expiresAt.setDate(expiresAt.getDate() + 7);

      return {
        periodKey: this.toIsoWeekKey(startsAt),
        startsAt,
        expiresAt,
      };
    }

    return {
      periodKey: 'LIFETIME',
      startsAt: new Date(0),
      expiresAt: null,
    };
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toIsoWeekKey(date: Date) {
    const target = new Date(date);

    target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));

    const firstThursday = new Date(target.getFullYear(), 0, 4);

    const week =
      1 +
      Math.round(
        ((target.getTime() - firstThursday.getTime()) / 86400000 -
          3 +
          ((firstThursday.getDay() + 6) % 7)) /
          7,
      );

    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
