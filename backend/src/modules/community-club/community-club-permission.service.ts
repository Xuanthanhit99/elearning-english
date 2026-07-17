import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunityClubRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import { applyCommunityDisplayNames } from '../community/community-display-name.util';
import {
  InviteClubMemberDto,
  RequestJoinClubDto,
  TransferClubOwnershipDto,
  UpdateClubMemberRoleDto,
} from './community-club-permission.dto';

const USER_SELECT = {
  id: true,
  fullname: true,
  username: true,
  avatar: true,
  level: true,
  xp: true,
  settings: {
    select: {
      communityNickname: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class CommunityClubPermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async getClubManagementSummary(actorId: string, clubId: string) {
    const actor = await this.getMembership(actorId, clubId);

    const [club, members, pendingRequests, pendingInvites] = await Promise.all([
      this.prisma.communityClub.findUnique({
        where: { id: clubId },
        include: {
          owner: { select: USER_SELECT },
          _count: {
            select: {
              members: true,
              joinRequests: true,
              invites: true,
            },
          },
        },
      }),
      this.prisma.communityClubMember.findMany({
        where: { clubId },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        include: {
          user: { select: USER_SELECT },
        },
      }),
      this.prisma.communityClubJoinRequest.findMany({
        where: {
          clubId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: USER_SELECT },
        },
      }),
      this.prisma.communityClubInvite.findMany({
        where: {
          clubId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          inviter: { select: USER_SELECT },
          invitee: { select: USER_SELECT },
        },
      }),
    ]);

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    return applyCommunityDisplayNames({
      club,
      members,
      pendingRequests,
      pendingInvites,
      permissions: {
        canDeleteClub: actor.role === 'OWNER',
        canTransferOwnership: actor.role === 'OWNER',
        canInvite: actor.role === 'OWNER' || actor.role === 'ADMIN',
        canApproveJoinRequests:
          actor.role === 'OWNER' || actor.role === 'ADMIN',
        canKickMembers: actor.role === 'OWNER' || actor.role === 'ADMIN',
        canChangeRoles: actor.role === 'OWNER',
      },
    });
  }

  async requestJoin(userId: string, clubId: string, dto: RequestJoinClubDto) {
    const club = await this.prisma.communityClub.findFirst({
      where: { id: clubId, isActive: true },
    });

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const existingMember = await this.prisma.communityClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (existingMember) {
      throw new ConflictException('Bạn đã là thành viên câu lạc bộ');
    }

    if (club.privacy === 'PUBLIC') {
      await this.addMember(clubId, userId, 'MEMBER');
      return { status: 'ACTIVE' };
    }

    const request = await this.prisma.communityClubJoinRequest.upsert({
      where: {
        clubId_userId: { clubId, userId },
      },
      create: {
        clubId,
        userId,
        message: dto.message?.trim() || null,
        status: 'PENDING',
      },
      update: {
        message: dto.message?.trim() || null,
        status: 'PENDING',
      },
      include: {
        user: { select: USER_SELECT },
      },
    });

    await this.notifications.createFromPayload({
      userId: club.ownerId,
      type: 'COMMUNITY',
      title: 'Yeu cau gia nhap club',
      message: 'Co thanh vien moi dang cho duyet vao club cua ban.',
      href: `/community/clubs/${clubId}`,
    });

    return applyCommunityDisplayNames({
      status: 'PENDING',
      request,
    });
  }

  async approveJoinRequest(actorId: string, clubId: string, requestId: string) {
    await this.assertCanManageMembers(actorId, clubId);

    const request = await this.prisma.communityClubJoinRequest.findFirst({
      where: {
        id: requestId,
        clubId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu gia nhập');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityClubJoinRequest.update({
        where: { id: request.id },
        data: { status: 'ACTIVE' },
      });

      const existing = await tx.communityClubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId: request.userId,
          },
        },
      });

      if (!existing) {
        await tx.communityClubMember.create({
          data: {
            clubId,
            userId: request.userId,
            role: 'MEMBER',
          },
        });

        await tx.communityClub.update({
          where: { id: clubId },
          data: { memberCount: { increment: 1 } },
        });
      }
    });

    await this.notifications.createFromPayload({
      userId: request.userId,
      type: 'COMMUNITY',
      title: 'Da duoc duyet vao club',
      message: 'Yeu cau gia nhap club cua ban da duoc chap nhan.',
      href: `/community/clubs/${clubId}`,
    });

    return { approved: true };
  }

  async rejectJoinRequest(actorId: string, clubId: string, requestId: string) {
    await this.assertCanManageMembers(actorId, clubId);

    const request = await this.prisma.communityClubJoinRequest.findFirst({
      where: {
        id: requestId,
        clubId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu gia nhập');
    }

    await this.prisma.communityClubJoinRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED' },
    });

    await this.notifications.createFromPayload({
      userId: request.userId,
      type: 'COMMUNITY',
      title: 'Yeu cau gia nhap bi tu choi',
      message: 'Yeu cau gia nhap club cua ban chua duoc chap nhan.',
      href: `/community/clubs/${clubId}`,
    });

    return { rejected: true };
  }

  async inviteMember(
    actorId: string,
    clubId: string,
    dto: InviteClubMemberDto,
  ) {
    const actor = await this.getMembership(actorId, clubId);

    if (!['OWNER', 'ADMIN'].includes(actor.role)) {
      throw new ForbiddenException(
        'Chỉ chủ câu lạc bộ hoặc Admin mới có quyền mời thành viên',
      );
    }

    if (dto.inviteeUserId === actorId) {
      throw new BadRequestException('Không thể tự mời chính mình');
    }

    const inviteeCommunitySettings =
      await this.settingsQuery.getCommunitySettings(dto.inviteeUserId);

    if (!inviteeCommunitySettings.allowClubInvites) {
      throw new ForbiddenException(
        'Người dùng này không nhận lời mời tham gia club',
      );
    }

    const existingMember = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: dto.inviteeUserId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('Người dùng đã là thành viên câu lạc bộ');
    }

    const invite = await this.prisma.communityClubInvite.upsert({
      where: {
        clubId_inviteeId: {
          clubId,
          inviteeId: dto.inviteeUserId,
        },
      },
      create: {
        clubId,
        inviterId: actorId,
        inviteeId: dto.inviteeUserId,
        message: dto.message?.trim() || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        inviterId: actorId,
        message: dto.message?.trim() || null,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        inviter: { select: USER_SELECT },
        invitee: { select: USER_SELECT },
      },
    });

    await this.notifications.createFromPayload({
      userId: dto.inviteeUserId,
      type: 'COMMUNITY',
      title: 'Loi moi tham gia club',
      message: 'Ban duoc moi tham gia mot club hoc tap.',
      href: `/community/clubs/${clubId}`,
    });

    return applyCommunityDisplayNames(invite);
  }

  async acceptInvite(userId: string, inviteId: string) {
    const invite = await this.prisma.communityClubInvite.findFirst({
      where: {
        id: inviteId,
        inviteeId: userId,
        status: 'PENDING',
      },
    });

    if (!invite) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await this.prisma.communityClubInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });

      throw new BadRequestException('Lời mời đã hết hạn');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityClubInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      const existing = await tx.communityClubMember.findUnique({
        where: {
          clubId_userId: {
            clubId: invite.clubId,
            userId,
          },
        },
      });

      if (!existing) {
        await tx.communityClubMember.create({
          data: {
            clubId: invite.clubId,
            userId,
            role: 'MEMBER',
          },
        });

        await tx.communityClub.update({
          where: { id: invite.clubId },
          data: { memberCount: { increment: 1 } },
        });
      }
    });

    await this.notifications.createFromPayload({
      userId: invite.inviterId,
      type: 'COMMUNITY',
      title: 'Loi moi da duoc chap nhan',
      message: 'Mot thanh vien da chap nhan loi moi vao club cua ban.',
      href: `/community/clubs/${invite.clubId}`,
    });

    return {
      accepted: true,
      clubId: invite.clubId,
    };
  }

  async rejectInvite(userId: string, inviteId: string) {
    const result = await this.prisma.communityClubInvite.updateMany({
      where: {
        id: inviteId,
        inviteeId: userId,
        status: 'PENDING',
      },
      data: { status: 'REJECTED' },
    });

    if (!result.count) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    return { rejected: true };
  }

  async transferOwnership(
    actorId: string,
    clubId: string,
    dto: TransferClubOwnershipDto,
  ) {
    const actor = await this.getMembership(actorId, clubId);

    if (actor.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ chủ câu lạc bộ mới được chuyển quyền');
    }

    if (dto.newOwnerUserId === actorId) {
      throw new BadRequestException('Người nhận quyền phải là thành viên khác');
    }

    const newOwner = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: dto.newOwnerUserId,
        },
      },
    });

    if (!newOwner) {
      throw new NotFoundException(
        'Người nhận quyền phải là thành viên câu lạc bộ',
      );
    }

    await this.prisma.$transaction([
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: { ownerId: dto.newOwnerUserId },
      }),
      this.prisma.communityClubMember.update({
        where: {
          clubId_userId: {
            clubId,
            userId: dto.newOwnerUserId,
          },
        },
        data: { role: 'OWNER' },
      }),
      this.prisma.communityClubMember.update({
        where: {
          clubId_userId: {
            clubId,
            userId: actorId,
          },
        },
        data: { role: 'ADMIN' },
      }),
    ]);

    await this.notifications.createFromPayload({
      userId: dto.newOwnerUserId,
      type: 'COMMUNITY',
      title: 'Ban la chu club moi',
      message: 'Quyen chu club da duoc chuyen cho ban.',
      href: `/community/clubs/${clubId}`,
    });

    return {
      transferred: true,
      newOwnerUserId: dto.newOwnerUserId,
    };
  }

  async updateMemberRole(
    actorId: string,
    clubId: string,
    memberId: string,
    dto: UpdateClubMemberRoleDto,
  ) {
    const actor = await this.getMembership(actorId, clubId);

    if (actor.role !== 'OWNER') {
      throw new ForbiddenException(
        'Chỉ chủ câu lạc bộ mới được đổi quyền thành viên',
      );
    }

    if (dto.role === 'OWNER') {
      throw new BadRequestException(
        'Hãy dùng chức năng chuyển quyền chủ phòng',
      );
    }

    const member = await this.prisma.communityClubMember.findFirst({
      where: {
        id: memberId,
        clubId,
      },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }

    const updated = await this.prisma.communityClubMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: {
        user: { select: USER_SELECT },
      },
    });

    await this.notifications.createFromPayload({
      userId: member.userId,
      type: 'COMMUNITY',
      title: 'Vai tro club da thay doi',
      message: `Vai tro cua ban trong club da duoc cap nhat thanh ${dto.role}.`,
      href: `/community/clubs/${clubId}`,
    });

    return applyCommunityDisplayNames(updated);
  }

  async kickMember(actorId: string, clubId: string, memberId: string) {
    const actor = await this.getMembership(actorId, clubId);

    if (!['OWNER', 'ADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Bạn không có quyền đuổi thành viên');
    }

    const target = await this.prisma.communityClubMember.findFirst({
      where: {
        id: memberId,
        clubId,
      },
    });

    if (!target) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }

    if (target.role === 'OWNER') {
      throw new ForbiddenException('Không thể đuổi chủ câu lạc bộ');
    }

    if (actor.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException('Admin không thể đuổi Admin khác');
    }

    if (target.userId === actorId) {
      throw new BadRequestException('Hãy dùng chức năng rời câu lạc bộ');
    }

    await this.prisma.$transaction([
      this.prisma.communityClubMember.delete({
        where: { id: target.id },
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    await this.notifications.createFromPayload({
      userId: target.userId,
      type: 'COMMUNITY',
      title: 'Da roi khoi club',
      message: 'Ban da duoc go khoi mot club hoc tap.',
      href: '/community',
    });

    return { kicked: true };
  }

  async leaveClub(userId: string, clubId: string) {
    const member = await this.getMembership(userId, clubId);

    if (member.role === 'OWNER') {
      const memberCount = await this.prisma.communityClubMember.count({
        where: { clubId },
      });

      if (memberCount > 1) {
        throw new ForbiddenException(
          'Club còn thành viên. Bạn phải chuyển quyền chủ phòng trước khi rời.',
        );
      }

      throw new ForbiddenException(
        'Bạn là thành viên duy nhất. Hãy xóa câu lạc bộ thay vì rời.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.communityClubMember.delete({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { left: true };
  }

  async deleteClub(actorId: string, clubId: string) {
    const actor = await this.getMembership(actorId, clubId);

    if (actor.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ chủ câu lạc bộ mới được xóa');
    }

    const memberCount = await this.prisma.communityClubMember.count({
      where: { clubId },
    });

    if (memberCount > 1) {
      throw new ForbiddenException(
        'Club còn thành viên. Hãy chuyển quyền hoặc xử lý thành viên trước.',
      );
    }

    await this.prisma.communityClub.delete({
      where: { id: clubId },
    });

    return {
      deleted: true,
    };
  }

  private async addMember(
    clubId: string,
    userId: string,
    role: CommunityClubRole,
  ) {
    const existing = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.communityClubMember.create({
        data: {
          clubId,
          userId,
          role,
        },
      });

      await tx.communityClub.update({
        where: { id: clubId },
        data: { memberCount: { increment: 1 } },
      });

      return member;
    });
  }

  private async getMembership(userId: string, clubId: string) {
    const membership = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không phải thành viên câu lạc bộ');
    }

    return membership;
  }

  private async assertCanManageMembers(userId: string, clubId: string) {
    const membership = await this.getMembership(userId, clubId);

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Bạn không có quyền quản lý thành viên');
    }

    return membership;
  }
}
