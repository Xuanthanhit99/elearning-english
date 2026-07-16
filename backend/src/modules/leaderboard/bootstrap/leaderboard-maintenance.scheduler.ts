import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeaderboardRewardService } from '../rewards/leaderboard-reward.service';
import { LeaderboardBootstrapService } from './leaderboard-bootstrap.service';

@Injectable()
export class LeaderboardMaintenanceScheduler {
  constructor(
    private readonly bootstrap: LeaderboardBootstrapService,
    private readonly rewards: LeaderboardRewardService,
  ) {}

  @Cron('0 */10 * * * *')
  async maintain() {
    await this.bootstrap.ensureCurrentWeeklySeason();
    await this.bootstrap.assignMissingProfiles();
    await this.bootstrap.recoverStuckCalculatingSeasons();
  }

  @Cron('0 0 * * * *')
  expireRewards() {
    return this.rewards.expireOldRewards();
  }
}
