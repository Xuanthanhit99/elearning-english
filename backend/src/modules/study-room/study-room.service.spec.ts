import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
import { StudyRoomService } from './study-room.service';

describe('StudyRoomService', () => {
  let service: StudyRoomService;

  const prismaMock = {
    studyRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    studyRoomMember: {
      create: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    studySession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    studySessionParticipant: {
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    xpTransaction: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) => fn(prismaMock)),
  };

  const learningXpMock = { publish: jest.fn().mockResolvedValue(undefined) };
  const notificationsMock = { createFromPayload: jest.fn() };
  const gatewayMock = {
    emitMemberJoined: jest.fn(),
    emitMemberLeft: jest.fn(),
    emitMemberUpdated: jest.fn(),
    emitSessionStarted: jest.fn(),
    emitSessionEnded: jest.fn(),
    emitKicked: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.$transaction = jest.fn(async (fn: any) => fn(prismaMock));
    learningXpMock.publish.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyRoomService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LearningXpPublisher, useValue: learningXpMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: StudyRoomGateway, useValue: gatewayMock },
      ],
    }).compile();

    service = module.get<StudyRoomService>(StudyRoomService);
  });

  describe('createRoom', () => {
    it('creates a room with a HOST member and no invite code for PUBLIC visibility', async () => {
      prismaMock.studyRoom.create.mockResolvedValue({
        id: 'room-1',
        hostId: 'user-1',
        visibility: StudyRoomVisibility.PUBLIC,
        members: [],
      });

      await service.createRoom('user-1', { name: 'Morning Study' } as any);

      expect(prismaMock.studyRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hostId: 'user-1',
            inviteCode: null,
            members: { create: { userId: 'user-1', role: StudyRoomMemberRole.HOST, ready: false } },
          }),
        }),
      );
    });

    it('generates an invite code for INVITE_ONLY rooms', async () => {
      prismaMock.studyRoom.create.mockResolvedValue({ id: 'room-1', members: [] });

      await service.createRoom('user-1', {
        name: 'Private Room',
        visibility: StudyRoomVisibility.INVITE_ONLY,
      } as any);

      const call = prismaMock.studyRoom.create.mock.calls[0][0];
      expect(call.data.inviteCode).toEqual(expect.any(String));
      expect(call.data.inviteCode.length).toBeGreaterThan(0);
    });
  });

  describe('joinRoom', () => {
    it('rejects joining an INVITE_ONLY room via the public join path', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        visibility: StudyRoomVisibility.INVITE_ONLY,
        members: [],
      });

      await expect(service.joinRoom('user-2', 'room-1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects a banned user from rejoining', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        visibility: StudyRoomVisibility.PUBLIC,
        maxMembers: 8,
        members: [{ userId: 'user-2', status: StudyRoomMemberStatus.BANNED }],
      });

      await expect(service.joinRoom('user-2', 'room-1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects joining a full room', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        visibility: StudyRoomVisibility.PUBLIC,
        maxMembers: 1,
        members: [{ userId: 'user-1', status: StudyRoomMemberStatus.ACTIVE }],
      });

      await expect(service.joinRoom('user-2', 'room-1')).rejects.toThrow(ConflictException);
    });

    it('creates a member and broadcasts on a successful join', async () => {
      prismaMock.studyRoom.findUnique
        .mockResolvedValueOnce({
          id: 'room-1',
          visibility: StudyRoomVisibility.PUBLIC,
          maxMembers: 8,
          members: [],
        })
        .mockResolvedValueOnce({
          id: 'room-1',
          visibility: StudyRoomVisibility.PUBLIC,
          members: [{ userId: 'user-2' }],
        });
      prismaMock.studyRoomMember.upsert.mockResolvedValue({ id: 'member-1', userId: 'user-2' });
      prismaMock.studySession.findFirst.mockResolvedValue(null);

      await service.joinRoom('user-2', 'room-1');

      expect(prismaMock.studyRoomMember.upsert).toHaveBeenCalled();
      expect(gatewayMock.emitMemberJoined).toHaveBeenCalledWith('room-1', expect.objectContaining({ userId: 'user-2' }));
    });
  });

  describe('kickMember / banMember', () => {
    it('only lets the host moderate members', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });

      await expect(service.kickMember('not-host', 'room-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('refuses to let the host kick themselves', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });

      await expect(service.kickMember('host-1', 'room-1', 'host-1')).rejects.toThrow(BadRequestException);
    });

    it('refuses to kick another host (re-assigned host case)', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });
      prismaMock.studyRoomMember.findUnique.mockResolvedValue({
        id: 'member-2',
        role: StudyRoomMemberRole.HOST,
        status: StudyRoomMemberStatus.ACTIVE,
      });

      await expect(service.kickMember('host-1', 'room-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('kicks a regular member and broadcasts', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });
      prismaMock.studyRoomMember.findUnique.mockResolvedValue({
        id: 'member-2',
        role: StudyRoomMemberRole.MEMBER,
        status: StudyRoomMemberStatus.ACTIVE,
      });
      prismaMock.studySession.findFirst.mockResolvedValue(null);

      await service.kickMember('host-1', 'room-1', 'user-2');

      expect(prismaMock.studyRoomMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-2' },
          data: expect.objectContaining({ status: StudyRoomMemberStatus.LEFT }),
        }),
      );
      expect(gatewayMock.emitKicked).toHaveBeenCalledWith('room-1', 'user-2', 'KICKED');
    });
  });

  describe('startSession', () => {
    it('rejects starting when the room is not WAITING', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostId: 'host-1',
        status: StudyRoomStatus.IN_SESSION,
      });

      await expect(service.startSession('host-1', 'room-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects starting when no active members exist', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostId: 'host-1',
        status: StudyRoomStatus.WAITING,
        goalMinutes: 25,
      });
      prismaMock.studyRoomMember.findMany.mockResolvedValue([]);

      await expect(service.startSession('host-1', 'room-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects starting when not everyone is ready', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostId: 'host-1',
        status: StudyRoomStatus.WAITING,
        goalMinutes: 25,
      });
      prismaMock.studyRoomMember.findMany.mockResolvedValue([
        { userId: 'host-1', ready: true },
        { userId: 'user-2', ready: false },
      ]);

      await expect(service.startSession('host-1', 'room-1')).rejects.toThrow(ConflictException);
    });

    it('starts a session, creates participants, and broadcasts', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostId: 'host-1',
        status: StudyRoomStatus.WAITING,
        goalMinutes: 25,
      });
      prismaMock.studyRoomMember.findMany.mockResolvedValue([
        { userId: 'host-1', ready: true },
        { userId: 'user-2', ready: true },
      ]);
      prismaMock.studySession.create.mockResolvedValue({ id: 'session-1', roomId: 'room-1' });
      prismaMock.studyRoom.update.mockResolvedValue({});
      prismaMock.studyRoomMember.updateMany.mockResolvedValue({ count: 2 });

      await service.startSession('host-1', 'room-1');

      expect(prismaMock.studySession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roomId: 'room-1',
            goalMinutes: 25,
            participantCount: 2,
          }),
        }),
      );
      expect(gatewayMock.emitSessionStarted).toHaveBeenCalled();
    });
  });

  describe('endSessionManually', () => {
    it('throws if no active session exists', async () => {
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });
      prismaMock.studySession.findFirst.mockResolvedValue(null);

      await expect(service.endSessionManually('host-1', 'room-1')).rejects.toThrow(NotFoundException);
    });

    it('computes completion rate, awards XP only above the minimum threshold, and reopens the room', async () => {
      const startedAt = new Date(Date.now() - 20 * 60_000); // 20 minutes ago
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });
      prismaMock.studySession.findFirst.mockResolvedValue({
        id: 'session-1',
        roomId: 'room-1',
        goalMinutes: 25,
        endedAt: null,
        participants: [
          { id: 'p1', userId: 'host-1', joinedAt: startedAt, leftAt: null }, // ~80% complete
          { id: 'p2', userId: 'user-2', joinedAt: startedAt, leftAt: new Date(startedAt.getTime() + 60_000) }, // ~4% complete
        ],
      });
      prismaMock.studySession.findUnique.mockResolvedValue({
        id: 'session-1',
        roomId: 'room-1',
        goalMinutes: 25,
        endedAt: null,
        participants: [
          { id: 'p1', userId: 'host-1', joinedAt: startedAt, leftAt: null },
          { id: 'p2', userId: 'user-2', joinedAt: startedAt, leftAt: new Date(startedAt.getTime() + 60_000) },
        ],
      });
      prismaMock.xpTransaction.findUnique.mockResolvedValue({ finalXp: 18 });

      await service.endSessionManually('host-1', 'room-1');

      // Only host-1 (~80% completion, above MIN_COMPLETION_RATE_FOR_XP)
      // should trigger an XP publish — user-2 (~4%) should not.
      expect(learningXpMock.publish).toHaveBeenCalledTimes(1);
      expect(learningXpMock.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'host-1', activity: 'STUDY_ROOM_SESSION_COMPLETED' }),
      );
      expect(prismaMock.studyRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: StudyRoomStatus.WAITING } }),
      );
      expect(gatewayMock.emitSessionEnded).toHaveBeenCalled();
    });

    it('retries the XP ledger read-back when it is not yet visible (serializable-conflict race)', async () => {
      const startedAt = new Date(Date.now() - 20 * 60_000);
      prismaMock.studyRoom.findUnique.mockResolvedValue({ id: 'room-1', hostId: 'host-1' });
      const participants = [{ id: 'p1', userId: 'host-1', joinedAt: startedAt, leftAt: null }];
      prismaMock.studySession.findFirst.mockResolvedValue({
        id: 'session-1',
        roomId: 'room-1',
        goalMinutes: 25,
        endedAt: null,
        participants,
      });
      prismaMock.studySession.findUnique.mockResolvedValue({
        id: 'session-1',
        roomId: 'room-1',
        goalMinutes: 25,
        endedAt: null,
        participants,
      });
      // First two reads see nothing yet (XpService's serializable-conflict
      // retry hasn't committed), third read finds the real row.
      prismaMock.xpTransaction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ finalXp: 15 });

      await service.endSessionManually('host-1', 'room-1');

      expect(prismaMock.xpTransaction.findUnique).toHaveBeenCalledTimes(3);
      const updateCall = prismaMock.studySessionParticipant.update.mock.calls.find(
        (c: any[]) => c[0].where.id === 'p1',
      );
      expect(updateCall[0].data.xpAwarded).toBe(15);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('ends every session whose endsAt has passed', async () => {
      prismaMock.studySession.findMany.mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);
      prismaMock.studySession.findUnique.mockResolvedValue({
        id: 'session-1',
        roomId: 'room-1',
        goalMinutes: 25,
        endedAt: null,
        participants: [],
      });

      await service.cleanupExpiredSessions();

      expect(prismaMock.studySession.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendScheduledReminders', () => {
    it('notifies active members and marks the reminder as sent', async () => {
      prismaMock.studyRoom.findMany.mockResolvedValue([
        {
          id: 'room-1',
          name: 'Evening Study',
          members: [{ userId: 'user-1' }, { userId: 'user-2' }],
        },
      ]);
      prismaMock.studyRoom.update.mockResolvedValue({});

      await service.sendScheduledReminders();

      expect(notificationsMock.createFromPayload).toHaveBeenCalledTimes(2);
      expect(prismaMock.studyRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'room-1' }, data: expect.objectContaining({ reminderSentAt: expect.any(Date) }) }),
      );
    });
  });
});
