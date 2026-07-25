import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import {
  StudyRoomMemberRole,
  StudyRoomMemberStatus,
  StudyRoomStatus,
  StudyRoomVisibility,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { NotificationsService } from '../notifications/notifications.service';
import { StudyRoomGateway } from './study-room.gateway';
import { CreateStudyRoomDto } from './dto/create-study-room.dto';
import { ListStudyRoomsDto } from './dto/list-study-rooms.dto';

// Below this, a participant's presence in a completed session is too brief
// to count as real study time — filters out instant join-then-leave XP
// farming while still rewarding anyone who genuinely showed up.
const MIN_COMPLETION_RATE_FOR_XP = 20;
const REMINDER_LEAD_MINUTES = 10;

const ROOM_MEMBER_INCLUDE = {
  members: {
    where: { status: { not: StudyRoomMemberStatus.LEFT } },
    include: {
      user: {
        select: { id: true, fullname: true, username: true, avatar: true, level: true },
      },
    },
  },
} as const;

@Injectable()
export class StudyRoomService {
  private readonly logger = new Logger(StudyRoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly learningXp: LearningXpPublisher,
    private readonly notifications: NotificationsService,
    private readonly gateway: StudyRoomGateway,
  ) {}

  async listRooms(query: ListStudyRoomsDto) {
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 30);
    const cursor = query.cursor?.trim() || undefined;
    const search = query.search?.trim();

    const rooms = await this.prisma.studyRoom.findMany({
      where: {
        visibility: StudyRoomVisibility.PUBLIC,
        ...(query.status ? { status: query.status } : { status: { not: StudyRoomStatus.ENDED } }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { topic: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: { where: { status: StudyRoomMemberStatus.ACTIVE } } } },
        host: { select: { id: true, fullname: true, username: true, avatar: true } },
      },
    });

    const hasMore = rooms.length > limit;
    const items = hasMore ? rooms.slice(0, limit) : rooms;
    return {
      items: items.map((r) => this.mapRoomSummary(r)),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async myRooms(userId: string) {
    const memberships = await this.prisma.studyRoomMember.findMany({
      where: { userId, status: { not: StudyRoomMemberStatus.LEFT } },
      orderBy: { joinedAt: 'desc' },
      include: {
        room: {
          include: {
            _count: { select: { members: { where: { status: StudyRoomMemberStatus.ACTIVE } } } },
            host: { select: { id: true, fullname: true, username: true, avatar: true } },
          },
        },
      },
    });
    return memberships.map((m) => this.mapRoomSummary(m.room));
  }

  async getRoom(userId: string, roomId: string) {
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: ROOM_MEMBER_INCLUDE,
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng học');

    if (room.visibility !== StudyRoomVisibility.PUBLIC) {
      const isMember = room.members.some((m) => m.userId === userId);
      if (!isMember) throw new NotFoundException('Không tìm thấy phòng học');
    }

    const activeSession = await this.prisma.studySession.findFirst({
      where: { roomId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    return { ...this.mapRoom(room), activeSession };
  }

  async createRoom(userId: string, dto: CreateStudyRoomDto) {
    const visibility = dto.visibility ?? StudyRoomVisibility.PUBLIC;
    const room = await this.prisma.studyRoom.create({
      data: {
        hostId: userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        topic: dto.topic?.trim() || null,
        visibility,
        inviteCode: visibility === StudyRoomVisibility.INVITE_ONLY ? this.generateInviteCode() : null,
        goalMinutes: dto.goalMinutes ?? 25,
        maxMembers: dto.maxMembers ?? 8,
        scheduledStartAt: dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null,
        members: {
          create: { userId, role: StudyRoomMemberRole.HOST, ready: false },
        },
      },
      include: ROOM_MEMBER_INCLUDE,
    });
    return this.mapRoom(room);
  }

  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: { members: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng học');
    if (room.visibility === StudyRoomVisibility.INVITE_ONLY) {
      throw new ForbiddenException('Phòng này chỉ tham gia được bằng mã mời');
    }
    return this.joinRoomInternal(userId, room);
  }

  async joinRoomByCode(userId: string, inviteCode: string) {
    const room = await this.prisma.studyRoom.findUnique({
      where: { inviteCode },
      include: { members: true },
    });
    if (!room) throw new NotFoundException('Mã mời không hợp lệ');
    return this.joinRoomInternal(userId, room);
  }

  private async joinRoomInternal(
    userId: string,
    room: { id: string; maxMembers: number; status: StudyRoomStatus; members: { userId: string; status: StudyRoomMemberStatus }[] },
  ) {
    const existing = room.members.find((m) => m.userId === userId);
    if (existing?.status === StudyRoomMemberStatus.BANNED) {
      throw new ForbiddenException('Bạn đã bị cấm khỏi phòng này');
    }
    if (existing && existing.status !== StudyRoomMemberStatus.LEFT) {
      // Already an active/muted member — idempotent rejoin.
      return this.getRoom(userId, room.id);
    }

    const activeCount = room.members.filter(
      (m) => m.status === StudyRoomMemberStatus.ACTIVE || m.status === StudyRoomMemberStatus.MUTED,
    ).length;
    if (activeCount >= room.maxMembers) {
      throw new ConflictException('Phòng học đã đầy');
    }

    const member = await this.prisma.studyRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId, role: StudyRoomMemberRole.MEMBER },
      update: { status: StudyRoomMemberStatus.ACTIVE, ready: false, leftAt: null },
      include: { user: { select: { id: true, fullname: true, username: true, avatar: true, level: true } } },
    });

    // A room already IN_SESSION gets a late-joiner participant row so
    // their partial attendance still counts toward group XP at session end.
    const activeSession = await this.prisma.studySession.findFirst({
      where: { roomId: room.id, endedAt: null },
    });
    if (activeSession) {
      await this.prisma.studySessionParticipant.upsert({
        where: { sessionId_userId: { sessionId: activeSession.id, userId } },
        create: { sessionId: activeSession.id, userId },
        update: {},
      });
    }

    this.gateway.emitMemberJoined(room.id, member);
    return this.getRoom(userId, room.id);
  }

  async leaveRoom(userId: string, roomId: string) {
    const member = await this.assertActiveMember(roomId, userId);
    await this.prisma.studyRoomMember.update({
      where: { id: member.id },
      data: { status: StudyRoomMemberStatus.LEFT, leftAt: new Date() },
    });
    await this.recordParticipantLeave(roomId, userId);
    this.gateway.emitMemberLeft(roomId, { userId });

    if (member.role === StudyRoomMemberRole.HOST) {
      await this.reassignHostIfNeeded(roomId);
    }
    return { left: true };
  }

  private async reassignHostIfNeeded(roomId: string) {
    const nextHost = await this.prisma.studyRoomMember.findFirst({
      where: { roomId, status: StudyRoomMemberStatus.ACTIVE },
      orderBy: { joinedAt: 'asc' },
    });
    if (nextHost) {
      await this.prisma.studyRoomMember.update({
        where: { id: nextHost.id },
        data: { role: StudyRoomMemberRole.HOST },
      });
      this.gateway.emitMemberUpdated(roomId, { userId: nextHost.userId, role: 'HOST' });
    } else {
      // No members left at all — room has no one to resume it; close it out
      // rather than leaving an orphaned WAITING room in the public list.
      await this.prisma.studyRoom.update({ where: { id: roomId }, data: { status: StudyRoomStatus.ENDED } });
    }
  }

  async kickMember(hostId: string, roomId: string, targetUserId: string) {
    return this.moderateMember(hostId, roomId, targetUserId, StudyRoomMemberStatus.LEFT, 'KICKED');
  }

  async banMember(hostId: string, roomId: string, targetUserId: string) {
    return this.moderateMember(hostId, roomId, targetUserId, StudyRoomMemberStatus.BANNED, 'BANNED');
  }

  async muteMember(hostId: string, roomId: string, targetUserId: string, muted: boolean) {
    await this.assertHost(roomId, hostId);
    const target = await this.prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!target || target.status === StudyRoomMemberStatus.LEFT || target.status === StudyRoomMemberStatus.BANNED) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }
    const updated = await this.prisma.studyRoomMember.update({
      where: { id: target.id },
      data: { status: muted ? StudyRoomMemberStatus.MUTED : StudyRoomMemberStatus.ACTIVE },
    });
    this.gateway.emitMemberUpdated(roomId, { userId: targetUserId, status: updated.status });
    return { status: updated.status };
  }

  private async moderateMember(
    hostId: string,
    roomId: string,
    targetUserId: string,
    status: StudyRoomMemberStatus,
    reason: 'KICKED' | 'BANNED',
  ) {
    await this.assertHost(roomId, hostId);
    if (hostId === targetUserId) {
      throw new BadRequestException('Chủ phòng không thể tự loại chính mình');
    }
    const target = await this.prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!target || target.status === StudyRoomMemberStatus.LEFT) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }
    if (target.role === StudyRoomMemberRole.HOST) {
      throw new ForbiddenException('Không thể loại chủ phòng');
    }

    await this.prisma.studyRoomMember.update({
      where: { id: target.id },
      data: { status, leftAt: new Date() },
    });
    await this.recordParticipantLeave(roomId, targetUserId);
    this.gateway.emitKicked(roomId, targetUserId, reason);
    return { removed: true };
  }

  async startSession(hostId: string, roomId: string) {
    const room = await this.assertHost(roomId, hostId);
    if (room.status !== StudyRoomStatus.WAITING) {
      throw new BadRequestException('Phòng đang có buổi học diễn ra');
    }

    const activeMembers = await this.prisma.studyRoomMember.findMany({
      where: { roomId, status: StudyRoomMemberStatus.ACTIVE },
    });
    if (activeMembers.length === 0) {
      throw new BadRequestException('Cần ít nhất 1 thành viên sẵn sàng');
    }
    const notReady = activeMembers.filter((m) => !m.ready);
    if (notReady.length > 0) {
      throw new ConflictException('Tất cả thành viên cần sẵn sàng trước khi bắt đầu');
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + room.goalMinutes * 60_000);

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.studySession.create({
        data: {
          roomId,
          goalMinutes: room.goalMinutes,
          startedAt,
          endsAt,
          participantCount: activeMembers.length,
          participants: {
            create: activeMembers.map((m) => ({ userId: m.userId, joinedAt: startedAt })),
          },
        },
      });
      await tx.studyRoom.update({ where: { id: roomId }, data: { status: StudyRoomStatus.IN_SESSION } });
      await tx.studyRoomMember.updateMany({
        where: { roomId, status: StudyRoomMemberStatus.ACTIVE },
        data: { ready: false },
      });
      return created;
    });

    this.gateway.emitSessionStarted(roomId, session);
    return session;
  }

  async endSessionManually(hostId: string, roomId: string) {
    await this.assertHost(roomId, hostId);
    const session = await this.prisma.studySession.findFirst({
      where: { roomId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!session) throw new NotFoundException('Không có buổi học đang diễn ra');
    return this.endSession(session.id);
  }

  private async endSession(sessionId: string) {
    const session = await this.prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });
    if (!session || session.endedAt) return session;

    const endedAt = new Date();
    let awardedCount = 0;

    for (const participant of session.participants) {
      const leftAt = participant.leftAt ?? endedAt;
      const minutesPresent = Math.max(
        0,
        Math.round((leftAt.getTime() - participant.joinedAt.getTime()) / 60_000),
      );
      const completionRate = Math.min(100, Math.round((minutesPresent / session.goalMinutes) * 100));

      let xpAwarded = 0;
      if (completionRate >= MIN_COMPLETION_RATE_FOR_XP) {
        xpAwarded = await this.awardSessionXp(session.id, participant.userId, completionRate);
      }

      await this.prisma.studySessionParticipant.update({
        where: { id: participant.id },
        data: { leftAt, minutesPresent, xpAwarded },
      });
      if (xpAwarded > 0) awardedCount += 1;
    }

    const summary = `${session.participants.length} thành viên tham gia, ${awardedCount} người nhận XP nhóm.`;
    await this.prisma.studySession.update({
      where: { id: sessionId },
      data: { endedAt, summary },
    });
    await this.prisma.studyRoom.update({
      where: { id: session.roomId },
      data: { status: StudyRoomStatus.WAITING },
    });

    const updatedSession = { ...session, endedAt, summary };
    this.gateway.emitSessionEnded(session.roomId, updatedSession);
    return updatedSession;
  }

  private async awardSessionXp(sessionId: string, userId: string, completionRate: number) {
    // Unlike single-user activities (a conversation/speaking session
    // always belongs to one user), a StudySession is shared by every
    // participant — sourceId must be per-(session,user) since
    // XpTransaction.idempotencyKey is globally unique, not scoped by
    // userId internally (see XpService.awardXp).
    const sourceId = `${sessionId}:${userId}`;
    try {
      // LearningXpListener.calculateBonusXp() only produces a nonzero
      // bonus when `score` clears its 75/85/95 thresholds — it was built
      // for quality-graded activities. Passing completionRate as `score`
      // too (not just `completionRate`) is what actually makes the
      // maxBonusXp curve respond to how much of the goal was reached,
      // reusing the existing formula as-is rather than special-casing the
      // listener for an attendance-based activity.
      await this.learningXp.publish({
        activity: 'STUDY_ROOM_SESSION_COMPLETED',
        userId,
        sourceId,
        score: completionRate,
        completionRate,
        metadata: { studySessionId: sessionId },
      });

      // publish() is fire-and-forget (EventEmitter2, no return channel) —
      // emitAsync() awaits every listener, so by the time publish()
      // resolves the real XpTransaction row is normally already
      // committed. But XpService.awardXp runs under SERIALIZABLE
      // isolation with its own internal retry-on-conflict loop
      // (withSerializableRetry) — verified live via runtime validation:
      // two participants finishing the same study session concurrently
      // triggered a real P2034 conflict + retry, and reading the ledger
      // back immediately afterward returned null even though the retry
      // went on to succeed a beat later. A short bounded retry here
      // (unlike a duplicate award — idempotencyKey makes re-publishing
      // safe) closes that window without duplicating XpService's own
      // calculation.
      const idempotencyKey = `learning:STUDY_ROOM_SESSION_COMPLETED:${sourceId}`;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const txn = await this.prisma.xpTransaction.findUnique({ where: { idempotencyKey } });
        if (txn) return txn.finalXp;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return 0;
    } catch (error) {
      this.logger.error(
        `Study room XP award failed: session=${sessionId}, user=${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  async recordParticipantLeave(roomId: string, userId: string) {
    const session = await this.prisma.studySession.findFirst({ where: { roomId, endedAt: null } });
    if (!session) return;
    await this.prisma.studySessionParticipant.updateMany({
      where: { sessionId: session.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async getRoomHistory(userId: string, roomId: string) {
    await this.getRoom(userId, roomId); // ownership/visibility check, reused
    return this.prisma.studySession.findMany({
      where: { roomId, endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        participants: {
          select: { userId: true, minutesPresent: true, xpAwarded: true },
        },
      },
    });
  }

  // Scoped, indexed sweep (endedAt/endsAt index) — not a full table scan —
  // matching the hourly-cleanup pattern already established by
  // ConversationService.cleanupStaleSessions.
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredSessions() {
    const expired = await this.prisma.studySession.findMany({
      where: { endedAt: null, endsAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const session of expired) {
      await this.endSession(session.id);
    }
    if (expired.length > 0) {
      this.logger.log(`Auto-ended ${expired.length} expired study session(s).`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendScheduledReminders() {
    const windowEnd = new Date(Date.now() + REMINDER_LEAD_MINUTES * 60_000);
    const rooms = await this.prisma.studyRoom.findMany({
      where: {
        scheduledStartAt: { not: null, lte: windowEnd, gte: new Date() },
        reminderSentAt: null,
        status: { not: StudyRoomStatus.ENDED },
      },
      include: { members: { where: { status: StudyRoomMemberStatus.ACTIVE } } },
    });

    for (const room of rooms) {
      await Promise.all(
        room.members.map((m) =>
          this.notifications.createFromPayload({
            userId: m.userId,
            type: 'LEARNING_REMINDER',
            title: 'Sắp đến giờ học nhóm',
            message: `Phòng "${room.name}" sẽ bắt đầu trong ${REMINDER_LEAD_MINUTES} phút.`,
            href: '/study-rooms',
          }),
        ),
      );
      await this.prisma.studyRoom.update({
        where: { id: room.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }

  private async assertActiveMember(roomId: string, userId: string) {
    const member = await this.prisma.studyRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member || member.status === StudyRoomMemberStatus.LEFT || member.status === StudyRoomMemberStatus.BANNED) {
      throw new NotFoundException('Bạn không phải thành viên phòng này');
    }
    return member;
  }

  private async assertHost(roomId: string, userId: string) {
    const room = await this.prisma.studyRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng học');
    if (room.hostId !== userId) {
      throw new ForbiddenException('Chỉ chủ phòng mới có quyền thực hiện thao tác này');
    }
    return room;
  }

  private generateInviteCode() {
    return randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  private mapRoomSummary(room: any) {
    return {
      id: room.id,
      name: room.name,
      topic: room.topic,
      visibility: room.visibility,
      status: room.status,
      goalMinutes: room.goalMinutes,
      maxMembers: room.maxMembers,
      memberCount: room._count?.members ?? 0,
      host: room.host,
      scheduledStartAt: room.scheduledStartAt,
      createdAt: room.createdAt,
    };
  }

  private mapRoom(room: any) {
    return {
      id: room.id,
      hostId: room.hostId,
      name: room.name,
      description: room.description,
      topic: room.topic,
      visibility: room.visibility,
      inviteCode: room.inviteCode,
      goalMinutes: room.goalMinutes,
      maxMembers: room.maxMembers,
      status: room.status,
      scheduledStartAt: room.scheduledStartAt,
      createdAt: room.createdAt,
      members: room.members,
    };
  }
}
