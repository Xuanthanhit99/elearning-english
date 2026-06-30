import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { MissionAction, MissionType } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyMissions(@CurrentUser() user: any) {
    return this.missionsService.getMyMissions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/claim')
  claimReward(@CurrentUser() user: any, @Param('id') missionId: string) {
    return this.missionsService.claimReward(user.id, missionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  createMission(@Body() body: any) {
    return this.missionsService.createMission({
      title: body.title,
      description: body.description,
      type: body.type as MissionType,
      action: body.action as MissionAction,
      target: body.target,
      rewardXp: body.rewardXp || 0,
      rewardCoins: body.rewardCoins || 0,
      rewardFood: body.rewardFood || 0,
      rewardEnergy: body.rewardEnergy || 0,
      rewardHappiness: body.rewardHappiness || 0,
    });
  }
}
