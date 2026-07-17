import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LeaderboardRewardService } from './leaderboard-reward.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('leaderboard/rewards')
@UseGuards(JwtAuthGuard)
export class LeaderboardRewardController {
  constructor(
    private readonly rewards:
      LeaderboardRewardService,
  ) {}

  @Get()
  listMyRewards(
    @Req()
    req: {
      user: {
        id: string;
      };
    },
  ) {
    return this.rewards.listMyRewards(
      req.user.id,
    );
  }

  @Post(':id/claim')
  claim(
    @Req()
    req: {
      user: {
        id: string;
      };
    },
    @Param('id')
    rewardId: string,
  ) {
    return this.rewards.claim(
      req.user.id,
      rewardId,
    );
  }
}
