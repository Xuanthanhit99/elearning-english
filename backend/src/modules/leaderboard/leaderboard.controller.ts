import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LearningSkill } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

// Thay JwtAuthGuard bằng guard thực tế của dự án.

@Controller('leaderboards')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.service.getMe(req.user.id);
  }

  @Get('weekly')
  getWeekly(@Req() req: any, @Query() query: LeaderboardQueryDto) {
    return this.service.getWeekly(req.user.id, query);
  }

  @Get('monthly')
  getMonthly(@Req() req: any, @Query() query: LeaderboardQueryDto) {
    return this.service.getMonthly(req.user.id, query);
  }

  @Get('friends')
  getFriends(@Req() req: any, @Query() query: LeaderboardQueryDto) {
    return this.service.getFriends(req.user.id, query);
  }

  @Get('clubs/:clubId')
  getClub(
    @Req() req: any,
    @Param('clubId') clubId: string,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.service.getClub(req.user.id, clubId, query);
  }

  @Get('skills/:skill')
  getSkill(
    @Req() req: any,
    @Param('skill') skill: LearningSkill,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.service.getSkill(req.user.id, skill, query);
  }

  @Get('history')
  getHistory(@Req() req: any) {
    return this.service.getHistory(req.user.id);
  }

  @Get('rewards')
  getRewards(@Req() req: any) {
    return this.service.getRewards(req.user.id);
  }

  @Post('rewards/:assignmentId/claim')
  claimReward(@Req() req: any, @Param('assignmentId') assignmentId: string) {
    return this.service.claimReward(req.user.id, assignmentId);
  }

  @Patch('privacy')
  updatePrivacy(
    @Req() req: any,
    @Body()
    body: {
      optedOut?: boolean;
      showOnline?: boolean;
      showStreak?: boolean;
      useNickname?: boolean;
      leaderboardName?: string | null;
    },
  ) {
    return this.service.updatePrivacy(req.user.id, body);
  }

  @Get('my-clubs')
  getMyClubs(@Req() req: any) {
    return this.service.getMyClubs(req.user.id);
  }
}
