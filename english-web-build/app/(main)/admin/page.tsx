"use client";

import {
  Archive,
  Ban,
  CheckCircle2,
  Database,
  FileText,
  Flag,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AdminContentResponse,
  AdminAuditLog,
  AdminCommunityPost,
  AdminOperations,
  AdminOverview,
  AdminPaginated,
  AdminQueueSummary,
  AdminUser,
  applyAdminUserAction,
  getAdminAuditLogs,
  getAdminContent,
  getAdminModerationPosts,
  getAdminOperations,
  getAdminOverview,
  getAdminUsers,
  moderateAdminPost,
  updateAdminContentStatus,
} from "@/src/lib/admin-api";

type Tab = "overview" | "users" | "content" | "moderation" | "operations" | "audit";

const contentTypes = [
  "VOCABULARY",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "SPEAKING",
  "WRITING",
  "PLACEMENT",
  "COURSE",
];

export default function AdminBackofficePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminPaginated<AdminUser> | null>(null);
  const [content, setContent] = useState<AdminContentResponse | null>(null);
  const [posts, setPosts] = useState<AdminPaginated<AdminCommunityPost> | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminPaginated<AdminAuditLog> | null>(null);
  const [operations, setOperations] = useState<AdminOperations | null>(null);
  const [contentType, setContentType] = useState("VOCABULARY");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, usersData, contentData, postData, opsData, logsData] =
        await Promise.all([
          getAdminOverview(),
          getAdminUsers({ search, limit: 10 }),
          getAdminContent({ type: contentType, search, limit: 10 }),
          getAdminModerationPosts({ search, limit: 10 }),
          getAdminOperations(),
          getAdminAuditLogs({ search, limit: 10 }),
        ]);

      setOverview(overviewData);
      setUsers(usersData);
      setContent(contentData);
      setPosts(postData);
      setOperations(opsData);
      setAuditLogs(logsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  const cards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        title: "Người dùng",
        value: overview.users.total,
        sub: `${overview.users.active} active, ${overview.users.registrationsToday} mới hôm nay`,
        icon: Users,
        tone: "violet",
      },
      {
        title: "Nội dung",
        value:
          Number(overview.content.courses ?? 0) +
          Number(overview.content.lessons ?? 0) +
          Number(overview.content.vocabulary ?? 0),
        sub: "Course, lesson, vocabulary",
        icon: FileText,
        tone: "blue",
      },
      {
        title: "Cộng đồng",
        value: overview.community.posts,
        sub: `${overview.community.clubs} club, ${overview.community.comments} comment`,
        icon: Flag,
        tone: "emerald",
      },
      {
        title: "Sức khỏe",
        value: overview.operations.health.db.status,
        sub: `DB ${overview.operations.health.db.latencyMs}ms`,
        icon: HeartPulse,
        tone: overview.operations.health.db.status === "UP" ? "emerald" : "rose",
      },
    ];
  }, [overview]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950">
              <ShieldCheck size={15} />
              Admin Backoffice
            </div>
            <h1 className="mt-3 text-2xl font-black md:text-3xl">Trung tâm vận hành PoppyLingo</h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
              Quản trị người dùng, nội dung, moderation, queue, health và audit log trên cùng một màn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-100 disabled:opacity-60 dark:shadow-none"
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </header>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["overview", "Tổng quan"],
              ["users", "Users"],
              ["content", "Content"],
              ["moderation", "Moderation"],
              ["operations", "Ops"],
              ["audit", "Audit"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as Tab)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-black transition",
                  tab === key
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-300",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load();
              }}
              placeholder="Tìm user, nội dung, bài viết..."
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-11 rounded-2xl border border-violet-200 px-4 text-sm font-black text-violet-700"
            >
              Tìm
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {tab === "overview" && (
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-violet-50 p-3 text-violet-700 dark:bg-violet-950">
                          <Icon size={24} />
                        </div>
                        <span className="text-xs font-black uppercase text-slate-400">{card.title}</span>
                      </div>
                      <p className="mt-5 text-3xl font-black">{card.value}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">{card.sub}</p>
                    </div>
                  );
                })}
              </section>
            )}

            {tab === "users" && (
              <Panel title="User Management" description="Ban, unban, reset XP/streak và gán role có audit log.">
                <ResponsiveTable
                  columns={["Người dùng", "Role", "Status", "XP", "Streak", "Action"]}
                  rows={(users?.items ?? []).map((user) => [
                    <UserCell key="user" user={user} />,
                    user.role,
                    <StatusPill key="status" value={user.status} />,
                    user.xpProfile?.totalXp ?? user.xp,
                    user.xpProfile?.currentStreak ?? 0,
                    <div key="actions" className="flex flex-wrap gap-2">
                      <SmallAction
                        label={user.status === "BANNED" ? "Unban" : "Ban"}
                        loading={busyId === `${user.id}-ban`}
                        onClick={() =>
                          runAction(`${user.id}-ban`, () =>
                            applyAdminUserAction(user.id, {
                              action: user.status === "BANNED" ? "UNBAN" : "BAN",
                            }),
                          )
                        }
                      />
                      <SmallAction
                        label="Reset XP"
                        loading={busyId === `${user.id}-xp`}
                        onClick={() =>
                          runAction(`${user.id}-xp`, () =>
                            applyAdminUserAction(user.id, { action: "RESET_XP" }),
                          )
                        }
                      />
                    </div>,
                  ])}
                />
              </Panel>
            )}

            {tab === "content" && (
              <Panel
                title="Content Management"
                description="Bảng dùng chung cho Vocabulary, Grammar, Reading, Listening, Speaking, Writing, Placement và Course."
                action={
                  <select
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black dark:border-slate-700 dark:bg-slate-950"
                  >
                    {contentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                }
              >
                <ResponsiveTable
                  columns={["Tiêu đề", "Meta", "Trạng thái", "Cập nhật", "Action"]}
                  rows={(content?.items ?? []).map((item) => [
                    item.title ?? item.word ?? item.question ?? item.id,
                    item.level ?? item.source ?? item.type ?? item.slug ?? "-",
                    <StatusPill
                      key="status"
                      value={
                        item.status ??
                        (item.needsReview
                          ? "REVIEW"
                          : item.isPublished || item.isActive
                            ? "PUBLISHED"
                            : "DRAFT")
                      }
                    />,
                    formatDate(item.updatedAt ?? item.createdAt ?? item.createAt),
                    <div key="actions" className="flex flex-wrap gap-2">
                      <SmallAction
                        label="Publish"
                        loading={busyId === `${item.id}-publish`}
                        onClick={() =>
                          runAction(`${item.id}-publish`, () =>
                            updateAdminContentStatus(contentType, item.id, {
                              status: "PUBLISHED",
                            }),
                          )
                        }
                      />
                      <SmallAction
                        label="Archive"
                        loading={busyId === `${item.id}-archive`}
                        onClick={() =>
                          runAction(`${item.id}-archive`, () =>
                            updateAdminContentStatus(contentType, item.id, {
                              status: "ARCHIVED",
                            }),
                          )
                        }
                      />
                    </div>,
                  ])}
                />
              </Panel>
            )}

            {tab === "moderation" && (
              <Panel title="Community Moderation" description="Ẩn, khôi phục hoặc soft-delete bài viết cộng đồng.">
                <ResponsiveTable
                  columns={["Bài viết", "Tác giả", "Status", "Tương tác", "Action"]}
                  rows={(posts?.items ?? []).map((post) => [
                    <div key="post" className="max-w-md">
                      <p className="font-black">{post.title ?? "Bài viết cộng đồng"}</p>
                      <p className="line-clamp-2 text-xs font-semibold text-slate-500">{post.content}</p>
                    </div>,
                    post.author?.fullname ?? "-",
                    <StatusPill key="status" value={post.status} />,
                    `${post.commentsCount ?? 0} cmt / ${post.reactionsCount ?? 0} react`,
                    <div key="actions" className="flex flex-wrap gap-2">
                      <SmallAction
                        label={post.status === "HIDDEN" ? "Restore" : "Hide"}
                        loading={busyId === `${post.id}-hide`}
                        onClick={() =>
                          runAction(`${post.id}-hide`, () =>
                            moderateAdminPost(post.id, {
                              action: post.status === "HIDDEN" ? "RESTORE" : "HIDE",
                            }),
                          )
                        }
                      />
                      <SmallAction
                        label="Soft delete"
                        loading={busyId === `${post.id}-delete`}
                        onClick={() =>
                          runAction(`${post.id}-delete`, () =>
                            moderateAdminPost(post.id, { action: "DELETE" }),
                          )
                        }
                      />
                    </div>,
                  ])}
                />
              </Panel>
            )}

            {tab === "operations" && operations && (
              <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Panel title="Queue Monitoring" description="Theo dõi processing jobs an toàn, không restart worker từ UI.">
                  <QueueList queues={operations.queues} />
                </Panel>
                <Panel title="Health Dashboard" description="API, DB, scheduler, memory và trạng thái BullMQ.">
                  <div className="space-y-3">
                    <HealthRow label="API" value={operations.health.api.status} />
                    <HealthRow label="Database" value={`${operations.health.db.status} (${operations.health.db.latencyMs}ms)`} />
                    <HealthRow label="Redis" value={operations.health.redis.status} />
                    <HealthRow label="BullMQ" value={operations.health.bullmq.status} />
                    <HealthRow label="Memory" value={`${operations.health.memory.heapUsedMb}/${operations.health.memory.heapTotalMb} MB`} />
                  </div>
                </Panel>
                <Panel title="Feature Flags" description={operations.featureFlags.limitation}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(operations.featureFlags.flags).map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                        <span className="text-sm font-black">{key}</span>
                        <StatusPill value={enabled ? "ON" : "OFF"} />
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Cron Monitor" description="Các scheduled jobs đã đăng ký trong hệ thống.">
                  <ResponsiveTable
                    columns={["Job", "Module", "Status", "Last run"]}
                    rows={operations.cron.map((job) => [
                      job.name,
                      job.module,
                      <StatusPill key="status" value={job.status} />,
                      job.lastRun ?? "Chưa có dữ liệu",
                    ])}
                  />
                </Panel>
              </section>
            )}

            {tab === "audit" && (
              <Panel title="Audit Logs" description="Theo dõi thao tác quản trị, không lưu password/token/secret.">
                <ResponsiveTable
                  columns={["Action", "Admin", "Fields", "Thời gian"]}
                  rows={(auditLogs?.items ?? []).map((log) => [
                    log.action,
                    log.user?.email ?? "-",
                    Array.isArray(log.changedFields) ? log.changedFields.join(", ") : "-",
                    formatDate(log.createdAt),
                  ])}
                />
              </Panel>
            )}
          </>
        )}
      </div>
    </main>
  );

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác admin thất bại.");
    } finally {
      setBusyId(null);
    }
  }
}

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          {description && <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ResponsiveTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  if (!rows.length) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl bg-slate-50 p-6 text-center dark:bg-slate-950">
        <Database className="text-slate-300" size={36} />
        <p className="mt-3 font-black">Chưa có dữ liệu</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">Thử đổi bộ lọc hoặc làm mới trang.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-black">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="rounded-2xl bg-slate-50 dark:bg-slate-950">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 align-middle font-bold">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserCell({ user }: { user: AdminUser }) {
  return (
    <div>
      <p className="font-black">{user.settings?.communityNickname ?? user.fullname}</p>
      <p className="text-xs font-semibold text-slate-500">{user.email}</p>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const positive = ["ACTIVE", "PUBLISHED", "APPROVED", "UP", "ON", "configured"].includes(value);
  const warning = ["BANNED", "FAILED", "DOWN", "HIDDEN", "DELETED", "ARCHIVED", "OFF"].includes(value);

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
        positive
          ? "bg-emerald-50 text-emerald-700"
          : warning
            ? "bg-rose-50 text-rose-700"
            : "bg-violet-50 text-violet-700",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

function SmallAction({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-violet-200 px-3 text-xs font-black text-violet-700 disabled:opacity-50"
    >
      {label === "Ban" ? <Ban size={14} /> : label.includes("Archive") ? <Archive size={14} /> : <CheckCircle2 size={14} />}
      {loading ? "..." : label}
    </button>
  );
}

function QueueList({ queues }: { queues: AdminQueueSummary[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {queues.map((queue) => (
        <div key={queue.name} className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
          <p className="font-black">{queue.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{queue.source}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Metric label="Waiting" value={queue.waiting} />
            <Metric label="Active" value={queue.active} />
            <Metric label="Done" value={queue.completed} />
            <Metric label="Failed" value={queue.failed} danger={queue.failed > 0} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`text-xl font-black ${danger ? "text-rose-600" : "text-slate-950 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <span className="text-sm font-black">{label}</span>
      <span className="text-sm font-bold text-slate-500">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
