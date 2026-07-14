import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CreateCommunityChallengeDto,
  CreateCommunityClubDto,
  SendCommunityMessageDto,
  UpdateChallengeProgressDto,
} from './dto/community-social.dto';
import { CommunitySocialService } from './community-social.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunitySocialController {
  constructor(
    private readonly service: CommunitySocialService,
  ) {}

  private userId(req: AuthenticatedRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    if (!id) throw new Error('Không tìm thấy userId từ access token');
    return id;
  }

  @Get('posts/:postId/comments')
  getComments(@Param('postId') postId: string) {
    return this.service.getPostComments(postId);
  }

  @Get('users/search')
  searchUsers(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchUsers(
      this.userId(req),
      q ?? '',
      Number(limit) || 20,
    );
  }

  @Get('friends')
  getFriends(@Req() req: AuthenticatedRequest) {
    return this.service.getFriends(this.userId(req));
  }

  @Get('friend-requests')
  getFriendRequests(@Req() req: AuthenticatedRequest) {
    return this.service.getFriendRequests(this.userId(req));
  }

  @Post('friends/requests/:userId')
  sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.service.sendFriendRequest(
      this.userId(req),
      userId,
    );
  }

  @Patch('friends/requests/:requestId/accept')
  acceptFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.service.acceptFriendRequest(
      this.userId(req),
      requestId,
    );
  }

  @Patch('friends/requests/:requestId/reject')
  rejectFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.service.rejectFriendRequest(
      this.userId(req),
      requestId,
    );
  }

  @Delete('friends/:friendId')
  removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId') friendId: string,
  ) {
    return this.service.removeFriend(
      this.userId(req),
      friendId,
    );
  }

  @Get('clubs')
  listClubs(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
  ) {
    return this.service.listClubs(this.userId(req), search);
  }

  @Post('clubs')
  createClub(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommunityClubDto,
  ) {
    return this.service.createClub(this.userId(req), dto);
  }

  @Post('clubs/:clubId/join')
  joinClub(
    @Req() req: AuthenticatedRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.joinClub(this.userId(req), clubId);
  }

  @Delete('clubs/:clubId/leave')
  leaveClub(
    @Req() req: AuthenticatedRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.leaveClub(this.userId(req), clubId);
  }

  @Get('challenges')
  listChallenges(@Req() req: AuthenticatedRequest) {
    return this.service.listChallenges(this.userId(req));
  }

  @Post('challenges')
  createChallenge(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommunityChallengeDto,
  ) {
    return this.service.createChallenge(this.userId(req), dto);
  }

  @Post('challenges/:challengeId/join')
  joinChallenge(
    @Req() req: AuthenticatedRequest,
    @Param('challengeId') challengeId: string,
  ) {
    return this.service.joinChallenge(
      this.userId(req),
      challengeId,
    );
  }

  @Patch('challenges/:challengeId/progress')
  updateChallengeProgress(
    @Req() req: AuthenticatedRequest,
    @Param('challengeId') challengeId: string,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    return this.service.updateChallengeProgress(
      this.userId(req),
      challengeId,
      dto,
    );
  }

  @Get('leaderboard')
  getLeaderboard(
    @Query('period') period:
      | 'WEEKLY'
      | 'MONTHLY'
      | 'ALL_TIME' = 'WEEKLY',
  ) {
    return this.service.getLeaderboard(period);
  }

  @Get('conversations')
  listConversations(@Req() req: AuthenticatedRequest) {
    return this.service.listConversations(this.userId(req));
  }

  @Post('conversations/direct/:userId')
  openDirectConversation(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.service.openDirectConversation(
      this.userId(req),
      userId,
    );
  }

  @Get('conversations/:conversationId/messages')
  getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.getMessages(
      this.userId(req),
      conversationId,
      cursor,
    );
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendCommunityMessageDto,
  ) {
    return this.service.sendMessage(
      this.userId(req),
      conversationId,
      dto,
    );
  }
}
