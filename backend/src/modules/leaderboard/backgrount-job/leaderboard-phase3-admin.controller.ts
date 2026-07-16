import { Controller, Post, UseGuards } from '@nestjs/common';
import { LeaderboardWeeklyCloseService } from './leaderboard-weekly-close.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { LeaderboardRewardSeedService } from './leaderboard-reward-seed.service';

@Controller('admin/leaderboard/phase-3')
export class LeaderboardPhase3AdminController {
  constructor(
    private readonly weeklyClose: LeaderboardWeeklyCloseService,
    private rewardSeed: LeaderboardRewardSeedService,
  ) {}

  /*
   * Nên đặt JwtAuthGuard + Roles(ADMIN)
   * theo guard hiện tại của dự án.
   */
  @UseGuards(JwtAuthGuard)
  @Post('close-expired-week')
  closeExpiredWeek() {
    return this.weeklyClose.closeExpiredWeeklySeason();
  }

  @Post('seed-default-rewards')
  seedDefaultRewards() {
    return this.rewardSeed.seedDefaultWeeklyRewards();
  }
}
