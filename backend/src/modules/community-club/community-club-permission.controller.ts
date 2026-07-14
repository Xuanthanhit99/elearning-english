import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  InviteClubMemberDto,
  RequestJoinClubDto,
  TransferClubOwnershipDto,
  UpdateClubMemberRoleDto,
} from './community-club-permission.dto';
import { CommunityClubPermissionService } from './community-club-permission.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

type AuthRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityClubPermissionController {
  constructor(
    private readonly service: CommunityClubPermissionService,
  ) {}

  private userId(req: AuthRequest) {
    const id =
      req.user?.id ??
      req.user?.userId ??
      req.user?.sub;

    if (!id) {
      throw new UnauthorizedException(
        'Không tìm thấy userId trong access token',
      );
    }

    return id;
  }

  @Get('clubs/:clubId/management')
  management(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.getClubManagementSummary(
      this.userId(req),
      clubId,
    );
  }

  @Post('clubs/:clubId/join-request')
  requestJoin(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: RequestJoinClubDto,
  ) {
    return this.service.requestJoin(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Patch('clubs/:clubId/join-requests/:requestId/approve')
  approveJoin(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.service.approveJoinRequest(
      this.userId(req),
      clubId,
      requestId,
    );
  }

  @Patch('clubs/:clubId/join-requests/:requestId/reject')
  rejectJoin(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.service.rejectJoinRequest(
      this.userId(req),
      clubId,
      requestId,
    );
  }

  @Post('clubs/:clubId/invites')
  invite(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: InviteClubMemberDto,
  ) {
    return this.service.inviteMember(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Patch('club-invites/:inviteId/accept')
  acceptInvite(
    @Req() req: AuthRequest,
    @Param('inviteId') inviteId: string,
  ) {
    return this.service.acceptInvite(
      this.userId(req),
      inviteId,
    );
  }

  @Patch('club-invites/:inviteId/reject')
  rejectInvite(
    @Req() req: AuthRequest,
    @Param('inviteId') inviteId: string,
  ) {
    return this.service.rejectInvite(
      this.userId(req),
      inviteId,
    );
  }

  @Patch('clubs/:clubId/transfer-ownership')
  transferOwnership(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Body() dto: TransferClubOwnershipDto,
  ) {
    return this.service.transferOwnership(
      this.userId(req),
      clubId,
      dto,
    );
  }

  @Patch('clubs/:clubId/members/:memberId/role')
  updateRole(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateClubMemberRoleDto,
  ) {
    return this.service.updateMemberRole(
      this.userId(req),
      clubId,
      memberId,
      dto,
    );
  }

  @Delete('clubs/:clubId/members/:memberId/kick')
  kickMember(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.kickMember(
      this.userId(req),
      clubId,
      memberId,
    );
  }

  @Delete('clubs/:clubId/leave-safe')
  leaveClub(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.leaveClub(
      this.userId(req),
      clubId,
    );
  }

  @Delete('clubs/:clubId/delete-safe')
  deleteClub(
    @Req() req: AuthRequest,
    @Param('clubId') clubId: string,
  ) {
    return this.service.deleteClub(
      this.userId(req),
      clubId,
    );
  }
}
