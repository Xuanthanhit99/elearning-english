import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityClubRole,
  CommunityPostStatus,
  CommunityPostVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateClubDto,
  CreateClubEventDto,
  CreateClubMessageDto,
  CreateClubPostDto,
  CreateClubResourceDto,
  UpdateClubMemberDto,
} from './community-club.dto';
import { CommunityClubGateway } from './community-club.gateway';
import { applyCommunityDisplayNames } from '../community/community-display-name.util';

const USER_SELECT = {
  id: true,
  fullname: true,
  username: true,
  avatar: true,
  level: true,
  xp: true,
  englishLevel: true,
  settings: {
    select: {
      communityNickname: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class CommunityClubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CommunityClubGateway,
  ) {}

  async followUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }

    await this.prisma.communityFollow.upsert({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetId,
        },
      },
      create: {
        followerId: userId,
        followingId: targetId,
      },
      update: {},
    });

    return { following: true };
  }

  async unfollowUser(userId: string, targetId: string) {
    await this.prisma.communityFollow.deleteMany({
      where: {
        followerId: userId,
        followingId: targetId,
      },
    });

    return { following: false };
  }

  async getFollowing(userId: string) {
    const items = await this.prisma.communityFollow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
          select: USER_SELECT,
        },
      },
    });

    return applyCommunityDisplayNames(items.map((item) => item.following));
  }

  async getFollowers(userId: string) {
    const items = await this.prisma.communityFollow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: USER_SELECT,
        },
      },
    });

    return applyCommunityDisplayNames(items.map((item) => item.follower));
  }

  async createClub(userId: string, dto: CreateClubDto) {
    const slugBase = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const slug = `${slugBase}-${Date.now().toString(36)}`;

    return this.prisma.$transaction(async (tx) => {
      const club = await tx.communityClub.create({
        data: {
          ownerId: userId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          coverUrl: dto.coverUrl || null,
          iconUrl: dto.iconUrl || null,
          privacy: dto.privacy ?? 'PUBLIC',
          category: dto.category?.trim() || null,
          tags: (dto.tags ?? [])
            .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
            .filter(Boolean)
            .slice(0, 10),
        },
        include: {
          owner: { select: USER_SELECT },
        },
      });

      await tx.communityClubMember.create({
        data: {
          clubId: club.id,
          userId,
          role: 'OWNER',
        },
      });

      return applyCommunityDisplayNames({
        ...club,
        joined: true,
        myRole: 'OWNER',
        isOwner: true,
      });
    });
  }

  async getClub(userId: string, clubId: string) {
    const club = await this.prisma.communityClub.findFirst({
      where: {
        id: clubId,
        isActive: true,
      },
      include: {
        owner: { select: USER_SELECT },
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
            messages: true,
            events: true,
            resources: true,
          },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const membership = club.members[0] ?? null;

    return applyCommunityDisplayNames({
      ...club,
      joined: Boolean(membership),
      myRole: membership?.role ?? null,
      isOwner: club.ownerId === userId,
    });
  }

  async joinClub(userId: string, clubId: string, message?: string) {
    const club = await this.prisma.communityClub.findFirst({
      where: {
        id: clubId,
        isActive: true,
      },
    });

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    if (club.privacy === 'PRIVATE') {
      await this.prisma.communityClubJoinRequest.upsert({
        where: {
          clubId_userId: { clubId, userId },
        },
        create: {
          clubId,
          userId,
          message: message?.trim() || null,
        },
        update: {
          status: 'PENDING',
          message: message?.trim() || null,
        },
      });

      return { status: 'PENDING' };
    }

    await this.addMember(clubId, userId, 'MEMBER');
    return { status: 'ACTIVE' };
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
      throw new NotFoundException('Không tìm thấy yêu cầu tham gia');
    }

    await this.prisma.$transaction([
      this.prisma.communityClubJoinRequest.update({
        where: { id: request.id },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.communityClubMember.upsert({
        where: {
          clubId_userId: {
            clubId,
            userId: request.userId,
          },
        },
        create: {
          clubId,
          userId: request.userId,
          role: 'MEMBER',
        },
        update: {},
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: {
          memberCount: { increment: 1 },
        },
      }),
    ]);

    this.gateway.emitClubMemberUpdated(clubId, {
      userId: request.userId,
      status: 'ACTIVE',
    });

    return { approved: true };
  }

  async leaveClub(userId: string, clubId: string) {
    const member = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: { clubId, userId },
      },
    });

    if (!member) return { joined: false };

    if (member.role === 'OWNER') {
      throw new ForbiddenException(
        'Chủ câu lạc bộ phải chuyển quyền trước khi rời nhóm',
      );
    }

    await this.prisma.$transaction([
      this.prisma.communityClubMember.delete({
        where: {
          clubId_userId: { clubId, userId },
        },
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: {
          memberCount: { decrement: 1 },
        },
      }),
    ]);

    return { joined: false };
  }

  async getMembers(userId: string, clubId: string) {
    await this.assertActiveMember(userId, clubId);

    const members = await this.prisma.communityClubMember.findMany({
      where: { clubId },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: {
          select: USER_SELECT,
        },
      },
    });

    return applyCommunityDisplayNames(members);
  }

  async updateMemberRole(
    actorId: string,
    clubId: string,
    memberId: string,
    dto: UpdateClubMemberDto,
  ) {
    await this.assertOwner(actorId, clubId);

    const member = await this.prisma.communityClubMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: USER_SELECT,
        },
      },
    });

    this.gateway.emitClubMemberUpdated(clubId, member);
    return applyCommunityDisplayNames(member);
  }

  async removeMember(actorId: string, clubId: string, memberId: string) {
    await this.assertCanManageMembers(actorId, clubId);

    const member = await this.prisma.communityClubMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Không thể xóa chủ câu lạc bộ');
    }

    await this.prisma.$transaction([
      this.prisma.communityClubMember.delete({
        where: { id: memberId },
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: {
          memberCount: { decrement: 1 },
        },
      }),
    ]);

    this.gateway.emitClubMemberUpdated(clubId, {
      memberId,
      removed: true,
    });

    return { removed: true };
  }

  async getClubPosts(userId: string, clubId: string, cursor?: string) {
    await this.assertCanViewClub(userId, clubId);

    const posts = await this.prisma.communityPost.findMany({
      where: {
        clubId,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 11,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: USER_SELECT,
        },
        reactions: {
          where: { userId },
          select: { type: true },
        },
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            bookmarks: true,
          },
        },
      },
    });

    const hasMore = posts.length > 10;
    if (hasMore) posts.pop();

    return applyCommunityDisplayNames({
      items: posts,
      nextCursor: hasMore ? (posts.at(-1)?.id ?? null) : null,
    });
  }

  async createClubPost(userId: string, clubId: string, dto: CreateClubPostDto) {
    await this.assertActiveMember(userId, clubId);

    const post = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        clubId,
        type: dto.type,
        visibility: 'CLUB',
        status: 'PUBLISHED',
        title: dto.title?.trim() || null,
        content: dto.content.trim(),
        tags: (dto.tags ?? [])
          .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
          .filter(Boolean),
        media: dto.media
          ? (JSON.parse(JSON.stringify(dto.media)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        author: {
          select: USER_SELECT,
        },
      },
    });

    await this.prisma.communityClub.update({
      where: { id: clubId },
      data: {
        postCount: { increment: 1 },
      },
    });

    return applyCommunityDisplayNames(post);
  }

  async getMessages(userId: string, clubId: string, cursor?: string) {
    await this.assertActiveMember(userId, clubId);

    const messages = await this.prisma.communityClubMessage.findMany({
      where: {
        clubId,
        deletedAt: null,
      },
      take: 51,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: USER_SELECT,
        },
      },
    });

    const hasMore = messages.length > 50;
    if (hasMore) messages.pop();

    return applyCommunityDisplayNames({
      items: messages.reverse(),
      nextCursor: hasMore ? (messages[0]?.id ?? null) : null,
    });
  }

  async sendMessage(userId: string, clubId: string, dto: CreateClubMessageDto) {
    await this.assertActiveMember(userId, clubId);

    const message = await this.prisma.communityClubMessage.create({
      data: {
        clubId,
        senderId: userId,
        content: dto.content.trim(),
        media: dto.media
          ? (JSON.parse(JSON.stringify(dto.media)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        sender: {
          select: USER_SELECT,
        },
      },
    });

    const mapped = applyCommunityDisplayNames(message);
    this.gateway.emitClubMessage(clubId, mapped);
    return mapped;
  }

  async getEvents(userId: string, clubId: string) {
    await this.assertCanViewClub(userId, clubId);

    const events = await this.prisma.communityClubEvent.findMany({
      where: { clubId },
      orderBy: {
        startsAt: 'asc',
      },
      include: {
        creator: {
          select: USER_SELECT,
        },
        attendees: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return applyCommunityDisplayNames(events);
  }

  async createEvent(userId: string, clubId: string, dto: CreateClubEventDto) {
    await this.assertCanModerate(userId, clubId);

    const event = await this.prisma.communityClubEvent.create({
      data: {
        clubId,
        creatorId: userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        meetingUrl: dto.meetingUrl?.trim() || null,
      },
      include: {
        creator: {
          select: USER_SELECT,
        },
      },
    });

    return applyCommunityDisplayNames(event);
  }

  async attendEvent(userId: string, clubId: string, eventId: string) {
    await this.assertActiveMember(userId, clubId);

    const existing = await this.prisma.communityClubEventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.communityClubEventAttendee.create({
          data: {
            eventId,
            userId,
          },
        }),
        this.prisma.communityClubEvent.update({
          where: { id: eventId },
          data: {
            attendeeCount: { increment: 1 },
          },
        }),
      ]);
    }

    return { attending: true };
  }

  async getResources(userId: string, clubId: string) {
    await this.assertCanViewClub(userId, clubId);

    return this.prisma.communityClubResource.findMany({
      where: { clubId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploader: {
          select: USER_SELECT,
        },
      },
    });
  }

  async createResource(
    userId: string,
    clubId: string,
    dto: CreateClubResourceDto,
  ) {
    await this.assertActiveMember(userId, clubId);

    return this.prisma.communityClubResource.create({
      data: {
        clubId,
        uploaderId: userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        url: dto.url,
        fileName: dto.fileName || null,
        mimeType: dto.mimeType || null,
        sizeBytes: dto.sizeBytes ?? null,
      },
      include: {
        uploader: {
          select: USER_SELECT,
        },
      },
    });
  }

  private async addMember(
    clubId: string,
    userId: string,
    role: CommunityClubRole,
  ) {
    const existing = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: { clubId, userId },
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
        data: {
          memberCount: { increment: 1 },
        },
      });

      return member;
    });
  }

  private async assertCanViewClub(userId: string, clubId: string) {
    const club = await this.prisma.communityClub.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    if (club.privacy === 'PUBLIC') return;

    await this.assertActiveMember(userId, clubId);
  }

  private async assertActiveMember(userId: string, clubId: string) {
    const member = await this.prisma.communityClubMember.findUnique({
      where: {
        clubId_userId: { clubId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'Bạn cần tham gia câu lạc bộ để sử dụng tính năng này',
      );
    }

    return member;
  }

  private async assertCanModerate(userId: string, clubId: string) {
    const member = await this.assertActiveMember(userId, clubId);

    if (!['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      throw new ForbiddenException('Bạn không có quyền quản trị câu lạc bộ');
    }
  }

  private async assertCanManageMembers(userId: string, clubId: string) {
    const member = await this.assertActiveMember(userId, clubId);

    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Bạn không có quyền quản lý thành viên');
    }
  }

  private async assertOwner(userId: string, clubId: string) {
    const member = await this.assertActiveMember(userId, clubId);

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Chỉ chủ câu lạc bộ mới có quyền này');
    }
  }
}
