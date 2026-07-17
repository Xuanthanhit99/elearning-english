import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityActivityType,
  CommunityChallengeParticipantStatus,
  CommunityChallengeStatus,
  CommunityClubRole,
  CommunityConversationType,
  CommunityFriendRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import {
  CreateCommunityChallengeDto,
  CreateCommunityClubDto,
  SendCommunityMessageDto,
  UpdateChallengeProgressDto,
} from './dto/community-social.dto';
import { CommunitySocialGateway } from './community-social.gateway';
import { applyCommunityDisplayNames } from '../community/community-display-name.util';

const USER_CARD_SELECT = {
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
export class CommunitySocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CommunitySocialGateway,
    private readonly notifications: NotificationsService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async getPostComments(postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });

    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const comments = await this.prisma.communityComment.findMany({
      where: {
        postId,
        parentId: null,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: USER_CARD_SELECT },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: USER_CARD_SELECT },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    return applyCommunityDisplayNames(comments);
  }

  async searchUsers(currentUserId: string, q: string, limit = 20) {
    const keyword = q.trim();
    if (!keyword) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        status: 'ACTIVE',
        OR: [
          { fullname: { contains: keyword, mode: 'insensitive' } },
          { username: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      take: Math.min(Math.max(limit, 1), 50),
      select: USER_CARD_SELECT,
    });

    const ids = users.map((user) => user.id);

    const [friendships, requests] = await Promise.all([
      this.prisma.communityFriendship.findMany({
        where: {
          OR: [
            { userAId: currentUserId, userBId: { in: ids } },
            { userBId: currentUserId, userAId: { in: ids } },
          ],
        },
      }),
      this.prisma.communityFriendRequest.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { requesterId: currentUserId, addresseeId: { in: ids } },
            { addresseeId: currentUserId, requesterId: { in: ids } },
          ],
        },
      }),
    ]);

    return applyCommunityDisplayNames(users).map((user) => {
      const isFriend = friendships.some(
        (item) =>
          (item.userAId === currentUserId && item.userBId === user.id) ||
          (item.userBId === currentUserId && item.userAId === user.id),
      );

      const request = requests.find(
        (item) =>
          (item.requesterId === currentUserId &&
            item.addresseeId === user.id) ||
          (item.addresseeId === currentUserId && item.requesterId === user.id),
      );

      return {
        ...user,
        relationship: isFriend
          ? 'FRIEND'
          : request
            ? request.requesterId === currentUserId
              ? 'REQUEST_SENT'
              : 'REQUEST_RECEIVED'
            : 'NONE',
        requestId: request?.id ?? null,
      };
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.communityFriendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        userA: { select: USER_CARD_SELECT },
        userB: { select: USER_CARD_SELECT },
      },
    });

    return applyCommunityDisplayNames(
      friendships.map((item) =>
        item.userAId === userId ? item.userB : item.userA,
      ),
    );
  }

  async getFriendRequests(userId: string) {
    const requests = await this.prisma.communityFriendRequest.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: USER_CARD_SELECT },
      },
    });

    return applyCommunityDisplayNames(requests);
  }

  async sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('Không thể kết bạn với chính mình');
    }

    const addresseeCommunitySettings =
      await this.settingsQuery.getCommunitySettings(addresseeId);

    if (!addresseeCommunitySettings.allowFriendRequests) {
      throw new ForbiddenException('Người dùng này không nhận lời mời kết bạn');
    }

    const existingFriendship = await this.prisma.communityFriendship.findFirst({
      where: {
        OR: [
          { userAId: requesterId, userBId: addresseeId },
          { userAId: addresseeId, userBId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
      throw new ConflictException('Hai người đã là bạn bè');
    }

    const reverse = await this.prisma.communityFriendRequest.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: addresseeId,
          addresseeId: requesterId,
        },
      },
    });

    if (reverse?.status === 'PENDING') {
      return this.acceptFriendRequest(requesterId, reverse.id);
    }

    const request = await this.prisma.communityFriendRequest.upsert({
      where: {
        requesterId_addresseeId: { requesterId, addresseeId },
      },
      create: { requesterId, addresseeId },
      update: {
        status: 'PENDING',
        updatedAt: new Date(),
      },
      include: {
        requester: { select: USER_CARD_SELECT },
      },
    });

    this.gateway.emitUser(addresseeId, 'community:friend-request', request);
    await this.notifications.createFromPayload({
      userId: addresseeId,
      type: 'COMMUNITY',
      title: 'Loi moi ket ban',
      message: 'Ban co mot loi moi ket ban moi trong cong dong.',
      href: '/community',
    });
    return applyCommunityDisplayNames(request);
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.communityFriendRequest.findFirst({
      where: {
        id: requestId,
        addresseeId: userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    const [userAId, userBId] = [
      request.requesterId,
      request.addresseeId,
    ].sort();

    await this.prisma.$transaction([
      this.prisma.communityFriendRequest.update({
        where: { id: request.id },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.communityFriendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: {},
      }),
    ]);

    this.gateway.emitUser(request.requesterId, 'community:friend-accepted', {
      userId,
    });
    await this.notifications.createFromPayload({
      userId: request.requesterId,
      type: 'COMMUNITY',
      title: 'Da chap nhan ket ban',
      message: 'Loi moi ket ban cua ban da duoc chap nhan.',
      href: '/community',
    });

    return { accepted: true };
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const updated = await this.prisma.communityFriendRequest.updateMany({
      where: {
        id: requestId,
        addresseeId: userId,
        status: 'PENDING',
      },
      data: { status: 'REJECTED' },
    });

    if (!updated.count) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    return { rejected: true };
  }

  async removeFriend(userId: string, friendId: string) {
    const result = await this.prisma.communityFriendship.deleteMany({
      where: {
        OR: [
          { userAId: userId, userBId: friendId },
          { userAId: friendId, userBId: userId },
        ],
      },
    });

    return { removed: result.count > 0 };
  }

  async listClubs(userId?: string, search?: string) {
    const clubs = await this.prisma.communityClub.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                { tags: { has: search.replace(/^#/, '').toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        owner: { select: USER_CARD_SELECT },
        members: userId
          ? {
              where: { userId },
              select: { role: true },
            }
          : false,
      },
    });

    return applyCommunityDisplayNames(clubs).map((club) => ({
      ...club,
      joined: Array.isArray(club.members) && club.members.length > 0,
      myRole:
        Array.isArray(club.members) && club.members.length
          ? club.members[0].role
          : null,
    }));
  }

  async createClub(userId: string, dto: CreateCommunityClubDto) {
    const slugBase = dto.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const club = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityClub.create({
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
          owner: { select: USER_CARD_SELECT },
        },
      });

      await tx.communityClubMember.create({
        data: {
          clubId: created.id,
          userId,
          role: 'OWNER',
        },
      });

      await tx.communityActivityLog.create({
        data: {
          userId,
          type: 'JOIN_CLUB',
          points: 5,
          referenceId: created.id,
        },
      });

      return applyCommunityDisplayNames(created);
    });

    return { ...club, joined: true, myRole: 'OWNER' };
  }

  async joinClub(userId: string, clubId: string) {
    const club = await this.prisma.communityClub.findFirst({
      where: { id: clubId, isActive: true },
    });

    if (!club) throw new NotFoundException('Không tìm thấy câu lạc bộ');

    if (club.privacy === 'PRIVATE') {
      throw new ForbiddenException(
        'Câu lạc bộ riêng tư cần được quản trị viên phê duyệt',
      );
    }

    const existing = await this.prisma.communityClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.communityClubMember.create({
          data: { clubId, userId, role: 'MEMBER' },
        }),
        this.prisma.communityClub.update({
          where: { id: clubId },
          data: { memberCount: { increment: 1 } },
        }),
        this.prisma.communityActivityLog.create({
          data: {
            userId,
            type: 'JOIN_CLUB',
            points: 3,
            referenceId: clubId,
          },
        }),
      ]);
    }

    return { joined: true };
  }

  async leaveClub(userId: string, clubId: string) {
    const membership = await this.prisma.communityClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (!membership) return { joined: false };

    if (membership.role === 'OWNER') {
      throw new ForbiddenException(
        'Chủ câu lạc bộ không thể rời nhóm trước khi chuyển quyền',
      );
    }

    await this.prisma.$transaction([
      this.prisma.communityClubMember.delete({
        where: { clubId_userId: { clubId, userId } },
      }),
      this.prisma.communityClub.update({
        where: { id: clubId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { joined: false };
  }

  async listChallenges(userId?: string) {
    const now = new Date();

    await this.prisma.communityChallenge.updateMany({
      where: {
        status: 'UPCOMING',
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.communityChallenge.updateMany({
      where: {
        status: { in: ['UPCOMING', 'ACTIVE'] },
        endsAt: { lte: now },
      },
      data: { status: 'COMPLETED' },
    });

    const challenges = await this.prisma.communityChallenge.findMany({
      where: {
        status: { in: ['UPCOMING', 'ACTIVE', 'COMPLETED'] },
      },
      orderBy: [{ status: 'asc' }, { startsAt: 'asc' }],
      include: {
        creator: { select: USER_CARD_SELECT },
        participants: userId
          ? {
              where: { userId },
              select: {
                id: true,
                progress: true,
                status: true,
                completedAt: true,
              },
            }
          : false,
      },
    });

    return applyCommunityDisplayNames(challenges).map((challenge) => ({
      ...challenge,
      joined:
        Array.isArray(challenge.participants) &&
        challenge.participants.length > 0,
      myProgress:
        Array.isArray(challenge.participants) && challenge.participants.length
          ? challenge.participants[0]
          : null,
    }));
  }

  async createChallenge(userId: string, dto: CreateCommunityChallengeDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }

    const now = new Date();
    const status = startsAt <= now && endsAt > now ? 'ACTIVE' : 'UPCOMING';

    const challenge = await this.prisma.communityChallenge.create({
      data: {
        creatorId: userId,
        clubId: dto.clubId || null,
        title: dto.title.trim(),
        description: dto.description.trim(),
        target: dto.target,
        unit: dto.unit.trim(),
        rewardXp: dto.rewardXp ?? 0,
        startsAt,
        endsAt,
        status,
        challengeType: dto.challengeType ?? 'OTHER',
        audience: dto.audience ?? 'ALL_MEMBERS',
        maxParticipants: dto.maxParticipants ?? null,
        badge: dto.badge ?? 'BRONZE',
        coverUrl: dto.coverUrl ?? null,
      },
      include: {
        creator: { select: USER_CARD_SELECT },
      },
    });

    return applyCommunityDisplayNames(challenge);
  }

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.communityChallenge.findFirst({
      where: {
        id: challengeId,
        status: { in: ['UPCOMING', 'ACTIVE'] },
      },
    });

    if (!challenge) {
      throw new NotFoundException('Không tìm thấy thử thách đang mở');
    }

    const existing = await this.prisma.communityChallengeParticipant.findUnique(
      {
        where: { challengeId_userId: { challengeId, userId } },
      },
    );

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.communityChallengeParticipant.create({
          data: { challengeId, userId },
        }),
        this.prisma.communityChallenge.update({
          where: { id: challengeId },
          data: { participantCount: { increment: 1 } },
        }),
      ]);
    }

    return { joined: true };
  }

  async updateChallengeProgress(
    userId: string,
    challengeId: string,
    dto: UpdateChallengeProgressDto,
  ) {
    const challenge = await this.prisma.communityChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Không tìm thấy thử thách');
    }

    const progress = Math.min(dto.progress, challenge.target);
    const completed = progress >= challenge.target;

    const participant = await this.prisma.communityChallengeParticipant.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: {
        progress,
        status: completed ? 'COMPLETED' : 'JOINED',
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      const existingReward = await this.prisma.communityActivityLog.findFirst({
        where: {
          userId,
          type: 'COMPLETE_CHALLENGE',
          referenceId: challengeId,
        },
      });

      if (!existingReward) {
        await this.prisma.$transaction([
          this.prisma.communityActivityLog.create({
            data: {
              userId,
              type: 'COMPLETE_CHALLENGE',
              points: 50,
              referenceId: challengeId,
            },
          }),
          this.prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: challenge.rewardXp } },
          }),
        ]);
      }
    }

    return participant;
  }

  async getLeaderboard(period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME') {
    const now = new Date();
    const from =
      period === 'WEEKLY'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === 'MONTHLY'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : undefined;

    const grouped = await this.prisma.communityActivityLog.groupBy({
      by: ['userId'],
      where: from ? { createdAt: { gte: from } } : undefined,
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 50,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((item) => item.userId) } },
      select: USER_CARD_SELECT,
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return grouped.map((item, index) => ({
      rank: index + 1,
      points: item._sum.points ?? 0,
      user: applyCommunityDisplayNames(userMap.get(item.userId)),
    }));
  }

  async listConversations(userId: string) {
    const links = await this.prisma.communityConversationMember.findMany({
      where: { userId },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc',
        },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: { select: USER_CARD_SELECT },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: { select: USER_CARD_SELECT },
              },
            },
          },
        },
      },
    });

    return applyCommunityDisplayNames(
      links.map((link) => ({
        ...link.conversation,
        members: link.conversation.members.map((member) => member.user),
        lastMessage: link.conversation.messages[0] ?? null,
        lastReadAt: link.lastReadAt,
      })),
    );
  }

  async openDirectConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException(
        'Không thể tạo cuộc trò chuyện với chính mình',
      );
    }

    const memberships = await this.prisma.communityConversationMember.findMany({
      where: {
        userId: { in: [userId, otherUserId] },
        conversation: { type: 'DIRECT' },
      },
      select: {
        conversationId: true,
        userId: true,
      },
    });

    const grouped = new Map<string, Set<string>>();
    for (const item of memberships) {
      const set = grouped.get(item.conversationId) ?? new Set<string>();
      set.add(item.userId);
      grouped.set(item.conversationId, set);
    }

    const existingId = [...grouped.entries()].find(
      ([, members]) =>
        members.size === 2 && members.has(userId) && members.has(otherUserId),
    )?.[0];

    if (existingId) {
      return this.prisma.communityConversation.findUnique({
        where: { id: existingId },
      });
    }

    // A conversation that doesn't exist yet must respect the recipient's
    // messagePermission before we let a brand-new DM start.
    const recipientSettings =
      await this.settingsQuery.getCommunitySettings(otherUserId);

    if (recipientSettings.messagePermission === 'NOBODY') {
      throw new ForbiddenException('Người dùng này không nhận tin nhắn');
    }

    if (recipientSettings.messagePermission === 'FRIENDS') {
      const areFriends = await this.prisma.communityFriendship.findFirst({
        where: {
          OR: [
            { userAId: userId, userBId: otherUserId },
            { userAId: otherUserId, userBId: userId },
          ],
        },
        select: { id: true },
      });

      if (!areFriends) {
        throw new ForbiddenException(
          'Người dùng này chỉ nhận tin nhắn từ bạn bè',
        );
      }
    }

    return this.prisma.communityConversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
    });
  }

  async getMessages(userId: string, conversationId: string, cursor?: string) {
    await this.assertConversationMember(userId, conversationId);

    const messages = await this.prisma.communityMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: USER_CARD_SELECT },
      },
    });

    const hasMore = messages.length > 50;
    if (hasMore) messages.pop();

    return applyCommunityDisplayNames({
      items: messages.reverse(),
      nextCursor: hasMore ? (messages[0]?.id ?? null) : null,
    });
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendCommunityMessageDto,
  ) {
    await this.assertConversationMember(userId, conversationId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content.trim(),
          media: dto.media
            ? (JSON.parse(JSON.stringify(dto.media)) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
        include: {
          sender: { select: USER_CARD_SELECT },
        },
      });

      await tx.communityConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });

      await tx.communityActivityLog.create({
        data: {
          userId,
          type: 'SEND_MESSAGE',
          points: 1,
          referenceId: created.id,
        },
      });

      return created;
    });

    const mapped = applyCommunityDisplayNames(message);

    this.gateway.emitConversation(
      conversationId,
      'community:message-created',
      mapped,
    );

    const recipients = await this.prisma.communityConversationMember.findMany({
      where: {
        conversationId,
        userId: { not: userId },
      },
      select: { userId: true },
    });

    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.createFromPayload({
          userId: recipient.userId,
          type: 'COMMUNITY',
          title: 'Tin nhan cong dong moi',
          message: 'Ban co tin nhan moi trong cong dong.',
          href: '/community',
        }),
      ),
    );

    return mapped;
  }

  private async assertConversationMember(
    userId: string,
    conversationId: string,
  ) {
    const member = await this.prisma.communityConversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    }
  }
}
