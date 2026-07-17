import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { LeaderboardBootstrapService } from '../bootstrap/leaderboard-bootstrap.service';
import { LeaderboardRewardService } from '../rewards/leaderboard-reward.service';

@Controller('admin/leaderboard/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LeaderboardMaintenanceController {
  constructor(
    private readonly bootstrap: LeaderboardBootstrapService,
    private readonly rewards: LeaderboardRewardService,
  ) {}

  @Post('bootstrap')
  bootstrapSeason() {
    return this.bootstrap.ensureCurrentWeeklySeason();
  }

  @Post('assign-missing-users')
  assignMissingUsers() {
    return this.bootstrap.assignMissingProfiles();
  }

  @Post('recover-stuck-seasons')
  recoverStuckSeasons() {
    return this.bootstrap.recoverStuckCalculatingSeasons();
  }

  @Post('expire-rewards')
  expireRewards() {
    return this.rewards.expireOldRewards();
  }
}
