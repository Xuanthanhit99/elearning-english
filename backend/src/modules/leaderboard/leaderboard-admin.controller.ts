import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole, XpSourceType } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAdjustXpDto } from './dto/admin-adjust-xp.dto';
import { XpService } from './xp.service';

@Controller('admin/leaderboards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LeaderboardAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
  ) {}

  @Get('seasons')
  getSeasons() {
    return this.prisma.leaderboardSeason.findMany({
      include: { groups: { include: { _count: { select: { entries: true } } } } },
      orderBy: { startsAt: 'desc' },
      take: 30,
    });
  }

  @Get('xp-transactions')
  getTransactions(@Query('userId') userId?: string) {
    return this.prisma.xpTransaction.findMany({
      where: userId ? { userId } : undefined,
      include: { user: { select: { id: true, fullname: true, email: true } } },
      orderBy: { earnedAt: 'desc' },
      take: 100,
    });
  }

  @Post('xp-adjustments')
  adjustXp(@Req() req: any, @Body() dto: AdminAdjustXpDto) {
    return this.xpService.awardXp({
      userId: dto.userId,
      sourceType: XpSourceType.ADMIN_ADJUSTMENT,
      baseXp: dto.amount,
      reason: dto.reason,
      idempotencyKey: `admin:${req.user.id}:${dto.userId}:${Date.now()}`,
      metadata: { adminId: req.user.id },
    });
  }

  @Post('seed-rewards')
  async seedRewards() {
    const rewards = [
      { minRank: 1, maxRank: 1, title: 'Nhà vô địch tuần', rewardType: 'BUNDLE', rewardValue: { xp: 250, coins: 500 } },
      { minRank: 2, maxRank: 3, title: 'Top 3 tuần', rewardType: 'BUNDLE', rewardValue: { xp: 150, coins: 300 } },
      { minRank: 4, maxRank: 10, title: 'Top 10 tuần', rewardType: 'BUNDLE', rewardValue: { xp: 75, coins: 150 } },
    ];
    for (const reward of rewards) {
      await this.prisma.leaderboardReward.create({ data: reward });
    }
    return { created: rewards.length };
  }
}
