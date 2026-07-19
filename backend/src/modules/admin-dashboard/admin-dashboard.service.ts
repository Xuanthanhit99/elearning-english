import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityPostStatus,
  CourseStatus,
  OrderStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AdminContentStatusDto,
  AdminListQueryDto,
  AdminModerationActionDto,
  AdminUserActionDto,
} from './dto/admin-backoffice.dto';

type AdminActor = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type Paginated<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private get db() {
    return this.prismaService as any;
  }

  async getRevenue() {
    const orders = await this.prismaService.order.findMany({
      where: { status: OrderStatus.PAID },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            teacher: {
              select: {
                id: true,
                fullname: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    const totalOrders = orders.length;
    const uniqueStudents = new Set(orders.map((order) => order.userId));
    const totalStudents = uniqueStudents.size;

    const totalTeachers = await this.prismaService.user.count({
      where: { role: UserRole.TEACHER },
    });

    const platformFeeRate = 0.2;
    const platformFee = Math.round(platformFeeRate * totalRevenue);
    const teacherRevenue = totalRevenue - platformFee;
    const teacherRevenueMap: Record<string, any> = {};

    for (const order of orders) {
      const teacher = order.course.teacher;

      if (!teacherRevenueMap[teacher.id]) {
        teacherRevenueMap[teacher.id] = {
          teacherId: teacher.id,
          teacherName: teacher.fullname,
          teacherEmail: teacher.email,
          totalRevenue: 0,
          platformFee: 0,
          teacherRevenue: 0,
          orders: 0,
        };
      }

      const fee = Math.round(order.amount * platformFeeRate);
      const net = order.amount - fee;

      teacherRevenueMap[teacher.id].totalRevenue += order.amount;
      teacherRevenueMap[teacher.id].platformFee += fee;
      teacherRevenueMap[teacher.id].teacherRevenue += net;
      teacherRevenueMap[teacher.id].orders += 1;
    }

    return {
      totalRevenue,
      totalOrders,
      totalStudents,
      totalTeachers,
      platformFee,
      teacherRevenue,
      platformFeeRate,
      teacherRevenueSummary: Object.values(teacherRevenueMap),
      orders,
    };
  }

  async getOverview() {
    const sinceToday = new Date();
    sinceToday.setHours(0, 0, 0, 0);

    const [
      users,
      courses,
      lessons,
      vocabulary,
      grammarTopics,
      grammarLessons,
      reading,
      listening,
      speakingTopics,
      speakingLessons,
      writingTopics,
      writingLessons,
      placementQuestions,
      posts,
      comments,
      clubs,
      notifications,
      missions,
      achievements,
      leaderboardSeasons,
      auditLogs,
      queues,
      health,
    ] = await Promise.all([
      this.userStats(sinceToday),
      this.prismaService.course.count(),
      this.prismaService.lesson.count(),
      this.db.word.count(),
      this.db.grammarTopic.count(),
      this.db.grammarLesson.count(),
      this.db.readingArticle.count(),
      this.db.listeningQuestion.count(),
      this.db.speakingTopic.count(),
      this.db.speakingLesson.count(),
      this.db.writingTopic.count(),
      this.db.writingLesson.count(),
      this.db.placementQuestion.count(),
      this.db.communityPost.count(),
      this.db.communityComment.count(),
      this.db.communityClub.count(),
      this.db.notification.count(),
      this.db.userMissionV2.count(),
      this.db.achievement.count(),
      this.db.leaderboardSeason.count(),
      this.db.auditLog.count(),
      this.getQueueSummary(),
      this.getHealth(),
    ]);

    return {
      users,
      content: {
        courses,
        lessons,
        vocabulary,
        grammar: { topics: grammarTopics, lessons: grammarLessons },
        reading,
        listening,
        speaking: { topics: speakingTopics, lessons: speakingLessons },
        writing: { topics: writingTopics, lessons: writingLessons },
        placementQuestions,
      },
      community: { posts, comments, clubs },
      operations: {
        notifications,
        missions,
        achievements,
        leaderboardSeasons,
        auditLogs,
        queues,
        health,
      },
    };
  }

  async listUsers(query: AdminListQueryDto) {
    const { page, limit, skip } = this.normalizePagination(query);
    const where: Prisma.UserWhereInput = {};

    if (query.status) {
      where.status = query.status as UserStatus;
    }

    if (query.search) {
      where.OR = [
        { fullname: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createAt: 'desc' },
        select: {
          id: true,
          fullname: true,
          email: true,
          username: true,
          role: true,
          status: true,
          level: true,
          xp: true,
          englishLevel: true,
          createAt: true,
          updatedAt: true,
          xpProfile: {
            select: {
              totalXp: true,
              currentLevel: true,
              currentStreak: true,
              currentLeague: true,
            },
          },
          settings: {
            select: {
              communityNickname: true,
              twoFactorEnabled: true,
            },
          },
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return this.toPaginated(items, total, page, limit);
  }

  async getUserProfile(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullname: true,
        email: true,
        username: true,
        role: true,
        status: true,
        avatar: true,
        level: true,
        xp: true,
        englishLevel: true,
        learningGoal: true,
        createAt: true,
        updatedAt: true,
        xpProfile: true,
        settings: {
          select: {
            communityNickname: true,
            publicProfile: true,
            twoFactorEnabled: true,
          },
        },
        _count: {
          select: {
            lessonProgress: true,
            grammarLessonProgress: true,
            writingProcessingJobs: true,
            speakingProcessingJobs: true,
            placementProcessingJobs: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return user;
  }

  async applyUserAction(id: string, dto: AdminUserActionDto, actor: AdminActor) {
    const current = await this.prismaService.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, xp: true },
    });

    if (!current) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    if (current.id === actor.id && dto.action !== 'RESET_XP') {
      throw new BadRequestException('Admin không thể tự thay đổi trạng thái tài khoản trong backoffice.');
    }

    const changedFields: string[] = [];
    let updatedUser = current;

    await this.prismaService.$transaction(async (tx) => {
      if (dto.action === 'BAN') {
        updatedUser = await tx.user.update({
          where: { id },
          data: { status: UserStatus.BANNED },
          select: { id: true, role: true, status: true, xp: true },
        });
        changedFields.push('status');
      }

      if (dto.action === 'UNBAN') {
        updatedUser = await tx.user.update({
          where: { id },
          data: { status: UserStatus.ACTIVE },
          select: { id: true, role: true, status: true, xp: true },
        });
        changedFields.push('status');
      }

      if (dto.action === 'DEACTIVATE') {
        updatedUser = await tx.user.update({
          where: { id },
          data: { status: UserStatus.INACTIVE },
          select: { id: true, role: true, status: true, xp: true },
        });
        changedFields.push('status');
      }

      if (dto.action === 'ASSIGN_ROLE') {
        if (!dto.role) {
          throw new BadRequestException('Thiếu role mới.');
        }

        updatedUser = await tx.user.update({
          where: { id },
          data: { role: dto.role },
          select: { id: true, role: true, status: true, xp: true },
        });
        changedFields.push('role');
      }

      if (dto.action === 'RESET_XP') {
        updatedUser = await tx.user.update({
          where: { id },
          data: { xp: 0, level: 1 },
          select: { id: true, role: true, status: true, xp: true },
        });
        await tx.userXpProfile.updateMany({
          where: { userId: id },
          data: { totalXp: 0, currentLevel: 1 },
        });
        changedFields.push('xp', 'level', 'xpProfile');
      }

      if (dto.action === 'RESET_STREAK') {
        await tx.userXpProfile.updateMany({
          where: { userId: id },
          data: { currentStreak: 0 },
        });
        await tx.petProfile.updateMany({
          where: { userId: id },
          data: { streak: 0 },
        });
        await tx.userPet.updateMany({
          where: { userId: id },
          data: { streak: 0 },
        });
        changedFields.push('streak');
      }

      if (dto.action === 'RESET_PLACEMENT') {
        await tx.user.update({
          where: { id },
          data: { currentPlacementTestId: null },
        });
        await tx.userPlacement.deleteMany({ where: { userId: id } });
        changedFields.push('placement');
      }
    });

    await this.record(actor, `admin.user.${dto.action.toLowerCase()}`, changedFields, {
      targetUserId: id,
      before: current,
      after: updatedUser,
      reason: dto.reason ?? null,
    });

    return this.getUserProfile(id);
  }

  async listContent(query: AdminListQueryDto) {
    const type = this.requiredType(query.type);
    const { page, limit, skip } = this.normalizePagination(query);
    const { delegate, where, select, orderBy } = this.contentModel(type, query);

    const [items, total] = await Promise.all([
      delegate.findMany({ where, select, orderBy, skip, take: limit }),
      delegate.count({ where }),
    ]);

    return {
      type,
      ...this.toPaginated(items, total, page, limit),
    };
  }

  async updateContentStatus(
    type: string,
    id: string,
    dto: AdminContentStatusDto,
    actor: AdminActor,
  ) {
    const normalizedType = this.requiredType(type);
    const model = this.contentModel(normalizedType, {});
    const data = this.contentStatusPatch(normalizedType, dto.status);

    const item = await model.delegate.update({
      where: { id },
      data,
      select: model.select,
    });

    await this.record(actor, 'admin.content.status_update', Object.keys(data), {
      type: normalizedType,
      targetId: id,
      status: dto.status,
      reason: dto.reason ?? null,
    });

    return item;
  }

  async listModerationPosts(query: AdminListQueryDto) {
    const { page, limit, skip } = this.normalizePagination(query);
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { author: { fullname: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.communityPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          visibility: true,
          type: true,
          commentsCount: true,
          reactionsCount: true,
          createdAt: true,
          deletedAt: true,
          author: { select: { id: true, fullname: true, email: true } },
          club: { select: { id: true, name: true } },
        },
      }),
      this.db.communityPost.count({ where }),
    ]);

    return this.toPaginated(items, total, page, limit);
  }

  async moderatePost(id: string, dto: AdminModerationActionDto, actor: AdminActor) {
    const data =
      dto.action === 'RESTORE'
        ? { status: CommunityPostStatus.PUBLISHED, deletedAt: null }
        : dto.action === 'DELETE'
          ? { status: CommunityPostStatus.DELETED, deletedAt: new Date() }
          : { status: CommunityPostStatus.HIDDEN };

    const item = await this.db.communityPost.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
        authorId: true,
      },
    });

    await this.record(actor, `admin.moderation.post.${dto.action.toLowerCase()}`, Object.keys(data), {
      targetId: id,
      reason: dto.reason ?? null,
    });

    return item;
  }

  async listClubs(query: AdminListQueryDto) {
    const { page, limit, skip } = this.normalizePagination(query);
    const where: any = {};

    if (query.status === 'ACTIVE') where.isActive = true;
    if (query.status === 'ARCHIVED') where.isActive = false;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { owner: { fullname: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.communityClub.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          privacy: true,
          memberCount: true,
          postCount: true,
          isActive: true,
          createdAt: true,
          owner: { select: { id: true, fullname: true, email: true } },
        },
      }),
      this.db.communityClub.count({ where }),
    ]);

    return this.toPaginated(items, total, page, limit);
  }

  async moderateClub(id: string, dto: AdminModerationActionDto, actor: AdminActor) {
    const data: any = {};

    if (dto.action === 'ARCHIVE' || dto.action === 'DELETE') data.isActive = false;
    if (dto.action === 'RESTORE') data.isActive = true;
    if (dto.action === 'TRANSFER_OWNER') {
      if (!dto.targetUserId) {
        throw new BadRequestException('Thiếu targetUserId để chuyển chủ sở hữu.');
      }

      const target = await this.prismaService.user.findUnique({
        where: { id: dto.targetUserId },
        select: { id: true },
      });

      if (!target) {
        throw new NotFoundException('Không tìm thấy người nhận quyền sở hữu.');
      }

      data.ownerId = dto.targetUserId;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Thao tác moderation không hợp lệ.');
    }

    const item = await this.db.communityClub.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        isActive: true,
      },
    });

    await this.record(actor, `admin.moderation.club.${dto.action.toLowerCase()}`, Object.keys(data), {
      targetId: id,
      targetUserId: dto.targetUserId ?? null,
      reason: dto.reason ?? null,
    });

    return item;
  }

  async listAuditLogs(query: AdminListQueryDto) {
    const { page, limit, skip } = this.normalizePagination(query);
    const where: any = {};

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { fullname: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          changedFields: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { id: true, fullname: true, email: true } },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return this.toPaginated(items, total, page, limit);
  }

  async getOperations() {
    const [queues, health, featureFlags, systemSettings, cron] =
      await Promise.all([
        this.getQueueSummary(),
        this.getHealth(),
        this.getFeatureFlags(),
        this.getSystemSettings(),
        this.getCronMonitor(),
      ]);

    return { queues, health, featureFlags, systemSettings, cron };
  }

  async getQueueSummary() {
    const [writing, speaking, placement] = await Promise.all([
      this.groupJobStatus(this.db.writingProcessingJob),
      this.groupJobStatus(this.db.speakingProcessingJob),
      this.groupJobStatus(this.db.placementProcessingJob),
    ]);

    return [
      { name: 'writing-processing', source: 'database_processing_jobs', ...writing },
      { name: 'speaking-processing', source: 'database_processing_jobs', ...speaking },
      { name: 'placement-processing', source: 'database_processing_jobs', ...placement },
    ];
  }

  async getHealth() {
    const started = Date.now();
    let dbStatus: 'UP' | 'DOWN' = 'UP';
    let dbLatencyMs = 0;

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - started;
    } catch {
      dbStatus = 'DOWN';
      dbLatencyMs = Date.now() - started;
    }

    const memory = process.memoryUsage();

    return {
      api: { status: 'UP', uptimeSeconds: Math.round(process.uptime()) },
      db: { status: dbStatus, latencyMs: dbLatencyMs },
      redis: { status: 'CONFIGURED_BY_BULLMQ', note: 'Shared BullMQ connection is configured at app bootstrap.' },
      bullmq: { status: 'MONITORED_VIA_PROCESSING_JOBS' },
      scheduler: { status: 'UP', note: 'Nest ScheduleModule is enabled.' },
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
      checkedAt: new Date(),
    };
  }

  getFeatureFlags() {
    return {
      runtimeWritable: false,
      source: 'server_defaults',
      flags: {
        placement: true,
        leaderboard: true,
        community: true,
        aiWriting: true,
        aiSpeaking: true,
        notifications: true,
        recommendations: true,
      },
      limitation: 'Runtime persistence needs a dedicated settings table before production rollout.',
    };
  }

  getSystemSettings() {
    return {
      runtimeWritable: false,
      settings: {
        dailyXpTarget: 50,
        dailyMissionLimit: 5,
        leaderboardReset: 'weekly',
        dailyStudyMinutes: 20,
        vocabularyDailyGoal: 10,
        vocabularyReviewLimit: 20,
        placementRetakeDays: 14,
      },
      limitation: 'Values are exposed for ops visibility; writes are deferred until settings storage is added.',
    };
  }

  async getCronMonitor() {
    return [
      {
        name: 'leaderboard-weekly-close',
        module: 'Leaderboard',
        status: 'configured',
        lastRun: null,
        nextRun: null,
        durationMs: null,
      },
      {
        name: 'vocabulary-weekly-topic-generation',
        module: 'VocabularyJob',
        status: 'configured',
        lastRun: null,
        nextRun: null,
        durationMs: null,
      },
      {
        name: 'listening-audio-backfill',
        module: 'ListeningJob',
        status: 'configured',
        lastRun: null,
        nextRun: null,
        durationMs: null,
      },
    ];
  }

  private async userStats(sinceToday: Date) {
    const [total, active, banned, registrationsToday, teachers, admins] =
      await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.user.count({ where: { status: UserStatus.ACTIVE } }),
        this.prismaService.user.count({ where: { status: UserStatus.BANNED } }),
        this.prismaService.user.count({ where: { createAt: { gte: sinceToday } } }),
        this.prismaService.user.count({ where: { role: UserRole.TEACHER } }),
        this.prismaService.user.count({ where: { role: UserRole.ADMIN } }),
      ]);

    return { total, active, banned, registrationsToday, teachers, admins };
  }

  private normalizePagination(query: AdminListQueryDto | Record<string, any>) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    return { page, limit, skip: (page - 1) * limit };
  }

  private toPaginated<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): Paginated<T> {
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  private requiredType(type?: string) {
    if (!type) {
      throw new BadRequestException('Thiếu loại nội dung.');
    }

    return type.toUpperCase();
  }

  private contentModel(type: string, query: Partial<AdminListQueryDto>) {
    const search = query.search?.trim();
    const contains = (field: string) =>
      search ? { [field]: { contains: search, mode: 'insensitive' } } : undefined;

    const baseSelect = {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    };

    switch (type) {
      case 'VOCABULARY':
        return {
          delegate: this.db.word,
          where: {
            ...(search
              ? {
                  OR: [
                    { word: { contains: search, mode: 'insensitive' } },
                    { meaningVi: { contains: search, mode: 'insensitive' } },
                    { meaningEn: { contains: search, mode: 'insensitive' } },
                  ],
                }
              : {}),
            ...(query.status === 'REVIEW' ? { needsReview: true } : {}),
          },
          select: {
            id: true,
            word: true,
            meaningVi: true,
            meaningEn: true,
            level: true,
            source: true,
            isAiGenerated: true,
            needsReview: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        };
      case 'GRAMMAR':
        return this.activeModel(this.db.grammarLesson, search, baseSelect);
      case 'READING':
        return {
          delegate: this.db.readingArticle,
          where: {
            ...(contains('title') ? { OR: [contains('title'), contains('description')].filter(Boolean) } : {}),
            ...(query.status ? { isPublished: query.status === 'PUBLISHED' } : {}),
          },
          select: {
            ...baseSelect,
            slug: true,
            level: true,
            difficulty: true,
            isPublished: true,
          },
          orderBy: { updatedAt: 'desc' },
        };
      case 'LISTENING':
        return {
          delegate: this.db.listeningQuestion,
          where: {
            ...(search
              ? {
                  OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { topic: { contains: search, mode: 'insensitive' } },
                    { question: { contains: search, mode: 'insensitive' } },
                  ],
                }
              : {}),
            ...(query.status ? { isActive: query.status === 'PUBLISHED' } : {}),
          },
          select: {
            id: true,
            title: true,
            topic: true,
            level: true,
            question: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        };
      case 'SPEAKING':
        return this.activeModel(this.db.speakingLesson, search, {
          ...baseSelect,
          slug: true,
          level: true,
          isActive: true,
          isLocked: true,
        });
      case 'WRITING':
        return this.activeModel(this.db.writingLesson, search, {
          ...baseSelect,
          slug: true,
          level: true,
          type: true,
          isActive: true,
        });
      case 'PLACEMENT':
        return {
          delegate: this.db.placementQuestion,
          where: {
            ...(search ? { question: { contains: search, mode: 'insensitive' } } : {}),
            ...(query.status ? { isActive: query.status === 'PUBLISHED' } : {}),
          },
          select: {
            id: true,
            question: true,
            skill: true,
            level: true,
            type: true,
            source: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        };
      case 'COURSE':
        return {
          delegate: this.prismaService.course,
          where: {
            ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
            ...(query.status ? { status: query.status as CourseStatus } : {}),
          },
          select: {
            id: true,
            title: true,
            slug: true,
            level: true,
            status: true,
            price: true,
            createAt: true,
            updatedAt: true,
            teacher: { select: { id: true, fullname: true, email: true } },
          },
          orderBy: { updatedAt: 'desc' },
        };
      default:
        throw new BadRequestException(`Loại nội dung không hỗ trợ: ${type}`);
    }
  }

  private activeModel(delegate: any, search: string | undefined, select: Record<string, any>) {
    return {
      delegate,
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { ...select, isActive: true },
      orderBy: { updatedAt: 'desc' },
    };
  }

  private contentStatusPatch(type: string, status: AdminContentStatusDto['status']) {
    const isPublished = status === 'PUBLISHED' || status === 'APPROVED';
    const isArchived = status === 'ARCHIVED' || status === 'REJECTED';

    if (type === 'VOCABULARY') {
      return {
        needsReview: status === 'REVIEW' || isArchived,
        source: status === 'APPROVED' ? 'ADMIN' : undefined,
      };
    }

    if (type === 'READING') {
      return { isPublished };
    }

    if (type === 'COURSE') {
      const courseStatus =
        status === 'PUBLISHED' || status === 'APPROVED'
          ? CourseStatus.APPROVED
          : status === 'REJECTED' || status === 'ARCHIVED'
            ? CourseStatus.REJECTED
            : CourseStatus.DRAFT;
      return { status: courseStatus };
    }

    return { isActive: isPublished && !isArchived };
  }

  private async groupJobStatus(delegate: any) {
    const grouped = await delegate.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const counts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of grouped) {
      const status = String(row.status).toUpperCase();
      const count = row._count.status;
      counts.total += count;

      if (['QUEUED', 'WAITING', 'SUBMITTED'].includes(status)) counts.waiting += count;
      else if (['PROCESSING', 'ACTIVE', 'RUNNING'].includes(status)) counts.active += count;
      else if (['COMPLETED', 'DONE'].includes(status)) counts.completed += count;
      else if (['FAILED', 'ERROR'].includes(status)) counts.failed += count;
    }

    return counts;
  }

  private async record(
    actor: AdminActor,
    action: string,
    changedFields: string[],
    metadata: Prisma.InputJsonValue,
  ) {
    await this.auditLogService.record({
      userId: actor.id,
      action,
      changedFields,
      metadata,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }
}
