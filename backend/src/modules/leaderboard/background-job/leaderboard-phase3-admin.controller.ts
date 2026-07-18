import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { LeaderboardWeeklyCloseService } from './leaderboard-weekly-close.service';

@Controller('admin/leaderboard/phase-3')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LeaderboardPhase3AdminController {
  constructor(private readonly weeklyClose: LeaderboardWeeklyCloseService) {}

  @Post('close-expired-week')
  closeExpiredWeek() {
    return this.weeklyClose.closeExpiredWeeklySeason();
  }
}
