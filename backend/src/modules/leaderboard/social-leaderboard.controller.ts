import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SocialLeaderboardService } from './social-leaderboard.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('leaderboards/social')
@UseGuards(JwtAuthGuard)
export class SocialLeaderboardController {
  constructor(private readonly service: SocialLeaderboardService) {}

  @Get('friends')
  friends(@Req() req: any) {
    return this.service.getFriendsLeaderboard(req.user.id);
  }

  @Get('my-clubs')
  myClubs(@Req() req: any) {
    return this.service.getMyClubs(req.user.id);
  }

  @Get('clubs/:clubId')
  club(@Req() req: any, @Param('clubId') clubId: string) {
    return this.service.getClubLeaderboard(req.user.id, clubId);
  }

  @Get('activity/friends')
  friendsActivity(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.getFriendsActivity(req.user.id, Number(limit ?? 20));
  }

  @Get('activity/clubs/:clubId')
  clubActivity(
    @Req() req: any,
    @Param('clubId') clubId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getClubActivity(
      req.user.id,
      clubId,
      Number(limit ?? 20),
    );
  }

  @Post('challenges')
  createChallenge(@Req() req: any, @Body() dto: any) {
    return this.service.createChallenge(req.user.id, dto);
  }

  @Get('challenges/me')
  myChallenges(@Req() req: any) {
    return this.service.getMyChallenges(req.user.id);
  }

  @Post('challenges/:challengeId/accept')
  accept(
    @Req() req: any,
    @Param('challengeId') challengeId: string,
  ) {
    return this.service.acceptChallenge(req.user.id, challengeId);
  }
}
