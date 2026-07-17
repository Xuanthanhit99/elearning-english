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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CreateClubDto,
  CreateClubEventDto,
  CreateClubMessageDto,
  CreateClubPostDto,
  CreateClubResourceDto,
  UpdateClubMemberDto,
} from './community-club.dto';
import { CommunityClubService } from './community-club.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

type AuthRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityClubController {
  constructor(
    private readonly service: CommunityClubService,
  ) {}

  private userId(req: AuthRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    if (!id) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng.');
    }
    return id;
  }

  @Post('follows/:userId')
  follow(
    @Req() req: AuthRequest,
    @Param('userId') userId: string,
  ) {
    return this.service.followUser(this.userId(req), userId);
  }

  @Delete('follows/:userId')
  unfollow(
    @Req() req: AuthRequest,
    @Param('userId') userId: string,
  ) {
    return this.service.unfollowUser(this.userId(req), userId);
  }

  @Get('follows/following')
  following(@Req() req: AuthRequest) {
    return this.service.getFollowing(this.userId(req));
  }

  @Get('follows/followers')
  followers(@Req() req: AuthRequest) {
    return this.service.getFollowers(this.userId(req));
  }

  @Post('clubs')
  createClub(
    @Req() req: AuthRequest,
    @Body() dto: CreateClubDto,
  ) {
    return this.service.createClub(this.userId(req), dto);
  }

  @Get('clubs/:clubId')
  getClub(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.getClub(this.userId(req), clubId);
  }

  @Post('clubs/:clubId/join')
  joinClub(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() body: { message?: string },
  ) {
    return this.service.joinClub(
      this.userId(req),
      clubId,
      body.message,
    );
  }

  @Delete('clubs/:clubId/leave')
  leaveClub(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.leaveClub(this.userId(req), clubId);
  }

  @Get('clubs/:clubId/members')
  members(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.getMembers(this.userId(req), clubId);
  }

  @Patch('clubs/:clubId/members/:memberId')
  updateMember(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateClubMemberDto,
  ) {
    return this.service.updateMemberRole(
      this.userId(req),
      clubId,
      memberId,
      dto,
    );
  }

  @Delete('clubs/:clubId/members/:memberId')
  removeMember(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(
      this.userId(req),
      clubId,
      memberId,
    );
  }

  @Get('clubs/:clubId/posts')
  clubPosts(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.getClubPosts(
      this.userId(req),
      clubId,
      cursor,
    );
  }

  @Post('clubs/:clubId/posts')
  createClubPost(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubPostDto,
  ) {
    return this.service.createClubPost(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Get('clubs/:clubId/messages')
  messages(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.getMessages(
      this.userId(req),
      clubId,
      cursor,
    );
  }

  @Post('clubs/:clubId/messages')
  sendMessage(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubMessageDto,
  ) {
    return this.service.sendMessage(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Get('clubs/:clubId/events')
  events(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.getEvents(this.userId(req), clubId);
  }

  @Post('clubs/:clubId/events')
  createEvent(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubEventDto,
  ) {
    return this.service.createEvent(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Post('clubs/:clubId/events/:eventId/attend')
  attendEvent(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.service.attendEvent(
      this.userId(req),
      clubId,
      eventId,
    );
  }

  @Get('clubs/:clubId/resources')
  resources(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.getResources(this.userId(req), clubId);
  }

  @Post('clubs/:clubId/resources')
  createResource(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubResourceDto,
  ) {
    return this.service.createResource(
      this.userId(req),
      clubId,
      dto,
    );
  }
}
