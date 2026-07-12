import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProgressMissionV2Dto } from './dto/progress-mission-v2.dto';
import { MissionV2ProgressService } from './services/mission-v2-progress.service';
import { MissionV2QueryService } from './services/mission-v2-query.service';
import { MissionV2RewardService } from './services/mission-v2-reward.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('missions-v2')
@UseGuards(JwtAuthGuard)
export class MissionsV2Controller {
  constructor(
    private readonly queryService: MissionV2QueryService,
    private readonly progressService: MissionV2ProgressService,
    private readonly rewardService: MissionV2RewardService,
  ) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.queryService.getMyMissions(this.getUserId(req)),
    };
  }

  @Post('progress')
  async progress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ProgressMissionV2Dto,
  ) {
    return {
      success: true,
      data: await this.progressService.increase({
        userId: this.getUserId(req),
        ...dto,
      }),
    };
  }

  @Post(':missionId/claim')
  async claim(
    @Req() req: AuthenticatedRequest,
    @Param('missionId') missionId: string,
  ) {
    return {
      success: true,
      data: await this.rewardService.claim(this.getUserId(req), missionId),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!id) {
      throw new UnauthorizedException('Không xác định được người dùng.');
    }

    return id;
  }
}
