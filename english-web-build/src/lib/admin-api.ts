import { api } from "@/src/lib/axios";

export type AdminOverview = {
  users: {
    total: number;
    active: number;
    banned: number;
    registrationsToday: number;
    teachers: number;
    admins: number;
  };
  content: Record<string, unknown>;
  community: {
    posts: number;
    comments: number;
    clubs: number;
  };
  operations: {
    notifications: number;
    missions: number;
    achievements: number;
    leaderboardSeasons: number;
    auditLogs: number;
    queues: AdminQueueSummary[];
    health: AdminHealth;
  };
};

export type AdminPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminPaginated<T> = {
  items: T[];
  meta: AdminPaginationMeta;
};

export type AdminUser = {
  id: string;
  fullname: string;
  email: string;
  username?: string | null;
  role: string;
  status: string;
  level: number;
  xp: number;
  englishLevel?: string | null;
  createAt?: string;
  updatedAt?: string;
  xpProfile?: {
    totalXp: number;
    currentLevel: number;
    currentStreak: number;
    currentLeague: string;
  } | null;
  settings?: {
    communityNickname?: string | null;
    twoFactorEnabled?: boolean;
  } | null;
};

export type AdminQueueSummary = {
  name: string;
  source: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
};

export type AdminHealth = {
  api: { status: string; uptimeSeconds: number };
  db: { status: string; latencyMs: number };
  redis: { status: string; note?: string };
  bullmq: { status: string };
  scheduler: { status: string; note?: string };
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  checkedAt: string;
};

export type AdminContentItem = {
  id: string;
  title?: string | null;
  word?: string | null;
  question?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  level?: string | null;
  source?: string | null;
  type?: string | null;
  slug?: string | null;
  status?: string | null;
  isPublished?: boolean | null;
  isActive?: boolean | null;
  needsReview?: boolean | null;
  createdAt?: string | null;
  createAt?: string | null;
  updatedAt?: string | null;
};

export type AdminCommunityPost = {
  id: string;
  title?: string | null;
  content?: string | null;
  status: string;
  commentsCount?: number | null;
  reactionsCount?: number | null;
  author?: {
    fullname?: string | null;
  } | null;
};

export type AdminAuditLog = {
  id: string;
  action: string;
  changedFields?: string[] | null;
  createdAt: string;
  user?: {
    email?: string | null;
  } | null;
};

export type AdminContentResponse = AdminPaginated<AdminContentItem> & {
  type: string;
};

export type AdminOperations = {
  queues: AdminQueueSummary[];
  health: AdminHealth;
  featureFlags: {
    runtimeWritable: boolean;
    source: string;
    flags: AdminFeatureFlag[];
    limitation?: string;
  };
  systemSettings: {
    runtimeWritable: boolean;
    settings: Record<string, string | number | boolean>;
    limitation?: string;
  };
  cron: Array<{
    name: string;
    module: string;
    status: string;
    lastRun: string | null;
    nextRun: string | null;
    durationMs: number | null;
  }>;
};

export async function getAdminOverview() {
  const response = await api.get<AdminOverview>("/admin-dashboard");
  return response.data;
}

export async function getAdminUsers(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AdminPaginated<AdminUser>>("/admin-dashboard/users", {
    params,
  });
  return response.data;
}

export async function applyAdminUserAction(
  userId: string,
  payload: { action: string; role?: string; reason?: string },
) {
  const response = await api.patch<AdminUser>(
    `/admin-dashboard/users/${userId}/action`,
    payload,
  );
  return response.data;
}

export async function getAdminContent(params: {
  type: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AdminContentResponse>("/admin-dashboard/content", {
    params,
  });
  return response.data;
}

export async function updateAdminContentStatus(
  type: string,
  id: string,
  payload: { status: string; reason?: string },
) {
  const response = await api.patch<AdminContentItem>(
    `/admin-dashboard/content/${type}/${id}/status`,
    payload,
  );
  return response.data;
}

export async function getAdminModerationPosts(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AdminPaginated<AdminCommunityPost>>(
    "/admin-dashboard/moderation/posts",
    { params },
  );
  return response.data;
}

export async function moderateAdminPost(
  id: string,
  payload: { action: string; reason?: string },
) {
  const response = await api.patch<AdminCommunityPost>(
    `/admin-dashboard/moderation/posts/${id}`,
    payload,
  );
  return response.data;
}

export type AdminClub = {
  id: string;
  name: string;
  isActive?: boolean | null;
  memberCount?: number | null;
  owner?: { fullname?: string | null; email?: string | null } | null;
  _count?: { members?: number } | null;
};

export async function getAdminClubs(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AdminPaginated<AdminClub>>(
    "/admin-dashboard/moderation/clubs",
    { params },
  );
  return response.data;
}

export async function getAdminAuditLogs(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AdminPaginated<AdminAuditLog>>(
    "/admin-dashboard/audit-logs",
    { params },
  );
  return response.data;
}

export async function getAdminOperations() {
  const response = await api.get<AdminOperations>("/admin-dashboard/operations");
  return response.data;
}

export type AdminRevenue = {
  totalRevenue: number;
  totalOrders: number;
  totalStudents: number;
  totalTeachers: number;
  platformFee: number;
  teacherRevenue: number;
  platformFeeRate: number;
  teacherRevenueSummary: Array<{
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    totalRevenue: number;
    platformFee: number;
    teacherRevenue: number;
    orders: number;
  }>;
};

export async function getAdminRevenue() {
  const response = await api.get<AdminRevenue>("/admin-dashboard/revenue");
  return response.data;
}

export async function moderateAdminClub(
  id: string,
  payload: { action: string; targetUserId?: string; reason?: string },
) {
  const response = await api.patch(`/admin-dashboard/moderation/clubs/${id}`, payload);
  return response.data;
}

export type AdminFeatureFlag = {
  key: string;
  description: string | null;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy: { id: string; fullname: string; email: string } | null;
  runtimeWritable: boolean;
};

export async function setAdminFeatureFlag(key: string, isEnabled: boolean) {
  const response = await api.patch<AdminFeatureFlag>(
    `/admin-dashboard/operations/feature-flags/${key}`,
    { isEnabled },
  );
  return response.data;
}

export type AdminAiUsageSummary = {
  windowDays: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  averageDurationMs: number;
  byModule: Array<{ module: string; requests: number; averageDurationMs: number }>;
  dailyTrend: Array<{ day: string; count: number }>;
  note: string;
};

export async function getAdminAiUsage(fromDays?: number) {
  const response = await api.get<AdminAiUsageSummary>("/admin-dashboard/operations/ai-usage", {
    params: fromDays ? { fromDays } : undefined,
  });
  return response.data;
}

export type AdminBullMqQueueCount = {
  name: string;
  isPaused: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

export async function getAdminBullMqQueues() {
  const response = await api.get<AdminBullMqQueueCount[]>(
    "/admin-dashboard/operations/bullmq-queues",
  );
  return response.data;
}

export type AdminFailedJob = {
  id: string;
  name: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  timestamp: number;
};

export async function listAdminFailedJobs(queueName: string) {
  const response = await api.get<AdminFailedJob[]>(
    `/admin-dashboard/operations/queues/${queueName}/failed`,
  );
  return response.data;
}

export async function retryAdminJob(queueName: string, jobId: string) {
  const response = await api.post(
    `/admin-dashboard/operations/queues/${queueName}/jobs/${jobId}/retry`,
  );
  return response.data;
}

export async function removeAdminJob(queueName: string, jobId: string) {
  const response = await api.post(
    `/admin-dashboard/operations/queues/${queueName}/jobs/${jobId}/remove`,
  );
  return response.data;
}

export async function pauseAdminQueue(queueName: string) {
  const response = await api.post(`/admin-dashboard/operations/queues/${queueName}/pause`);
  return response.data;
}

export async function resumeAdminQueue(queueName: string) {
  const response = await api.post(`/admin-dashboard/operations/queues/${queueName}/resume`);
  return response.data;
}
