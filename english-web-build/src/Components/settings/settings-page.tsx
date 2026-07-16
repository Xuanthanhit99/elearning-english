'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  Brain,
  Brush,
  Lock,
  MessageCircle,
  Mic,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Field, SectionCard, Select, Toggle } from './ui';
import { DeviceSession, Settings } from '@/src/lib/settings-types';
import { settingsApi } from '@/src/lib/settings-api';

const tabs = [
  { id: 'learning', label: 'Học tập', icon: Brain },
  { id: 'ai', label: 'AI Teacher', icon: Bot },
  { id: 'speaking', label: 'Speaking', icon: Mic },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'community', label: 'Cộng đồng', icon: MessageCircle },
  { id: 'appearance', label: 'Giao diện', icon: Brush },
  { id: 'privacy', label: 'Quyền riêng tư', icon: Shield },
  { id: 'security', label: 'Bảo mật', icon: Lock },
  { id: 'advanced', label: 'Nâng cao', icon: Sparkles },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('learning');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      settingsApi.getDevices().catch(() => []),
    ]).then(([settingsData, deviceData]) => {
      setSettings(settingsData);
      setDevices(deviceData);
    });
  }, []);

  const dirtyPayload = useMemo(() => settings, [settings]);

  if (!settings) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-sm text-slate-500">Đang tải cài đặt...</div>
      </div>
    );
  }

  const patch = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await settingsApi.update(dirtyPayload);
      setSettings(updated);
      setMessage('Đã lưu cài đặt');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể lưu',
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const section =
      activeTab === 'security' ? 'privacy' : activeTab;
    const updated = await settingsApi.resetSection(section);
    setSettings(updated);
    setMessage('Đã khôi phục mặc định');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-600">
            <SlidersHorizontal className="h-4 w-4" />
            PoppyLingo Settings
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Cá nhân hóa trải nghiệm học
          </h1>
          <p className="mt-2 text-slate-500">
            Điều chỉnh lộ trình, AI, Speaking, cộng đồng và bảo mật.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm text-slate-500">{message}</span>
          )}
          <button
            onClick={reset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Mặc định
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-5">
          {activeTab === 'learning' && (
            <>
              <SectionCard
                title="Mục tiêu học tập"
                description="Dùng để ưu tiên nội dung trên Dashboard và tạo lộ trình."
              >
                <Field label="Mục tiêu chính">
                  <Select
                    value={settings.learningGoal}
                    onChange={(value) => patch('learningGoal', value)}
                    options={[
                      ['DAILY_ENGLISH', 'Giao tiếp hằng ngày'],
                      ['IELTS', 'IELTS'],
                      ['TOEIC', 'TOEIC'],
                      ['SPEAKING', 'Speaking'],
                      ['BUSINESS_ENGLISH', 'Tiếng Anh công việc'],
                      ['TRAVEL', 'Du lịch'],
                      ['GRAMMAR', 'Ngữ pháp'],
                      ['VOCABULARY', 'Từ vựng'],
                    ].map(([value, label]) => ({ value, label }))}
                  />
                </Field>
                <Field label="Thời lượng mỗi ngày">
                  <Select
                    value={settings.dailyStudyMinutes}
                    onChange={(value) =>
                      patch('dailyStudyMinutes', Number(value))
                    }
                    options={[10, 20, 30, 45, 60].map((value) => ({
                      value,
                      label: `${value} phút`,
                    }))}
                  />
                </Field>
                <Field label="Trình độ hiện tại">
                  <Select
                    value={settings.currentLevel}
                    onChange={(value) => patch('currentLevel', value)}
                    options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(
                      (value) => ({ value, label: value }),
                    )}
                  />
                </Field>
                <Field
                  label="Tự động đánh giá trình độ"
                  description="Điều chỉnh độ khó từ kết quả Placement Test và tiến độ."
                >
                  <Toggle
                    checked={settings.autoDetectLevel}
                    onChange={(value) =>
                      patch('autoDetectLevel', value)
                    }
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Lịch học">
                <Field label="Mục tiêu số ngày mỗi tuần">
                  <Select
                    value={settings.weeklyTargetDays}
                    onChange={(value) =>
                      patch('weeklyTargetDays', Number(value))
                    }
                    options={[3, 4, 5, 6, 7].map((value) => ({
                      value,
                      label: `${value} ngày`,
                    }))}
                  />
                </Field>
                <Field label="Giờ học ưa thích">
                  <input
                    type="time"
                    value={settings.preferredStudyTime}
                    onChange={(e) =>
                      patch('preferredStudyTime', e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                </Field>
                <Field
                  label="AI tự sắp lịch"
                  description="Tự đề xuất khung giờ phù hợp dựa trên Learning DNA."
                >
                  <Toggle
                    checked={settings.autoSchedule}
                    onChange={(value) => patch('autoSchedule', value)}
                  />
                </Field>
              </SectionCard>
            </>
          )}

          {activeTab === 'ai' && (
            <SectionCard
              title="AI Teacher"
              description="Cá nhân hóa phong cách phản hồi và sửa lỗi."
            >
              <Field label="Giáo viên AI">
                <Select
                  value={settings.aiTeacher}
                  onChange={(value) => patch('aiTeacher', value)}
                  options={['Emily', 'David', 'Emma', 'Sophia'].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              </Field>
              <Field label="Tính cách AI">
                <Select
                  value={settings.aiPersonality}
                  onChange={(value) => patch('aiPersonality', value)}
                  options={[
                    ['TEACHER', 'Giáo viên'],
                    ['COACH', 'Huấn luyện viên'],
                    ['FRIEND', 'Bạn đồng hành'],
                    ['STRICT_MENTOR', 'Người hướng dẫn nghiêm túc'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Chế độ sửa lỗi">
                <Select
                  value={settings.correctionMode}
                  onChange={(value) => patch('correctionMode', value)}
                  options={[
                    ['MAJOR_ONLY', 'Chỉ sửa lỗi quan trọng'],
                    ['CORRECT_EVERYTHING', 'Sửa mọi lỗi'],
                    ['EXPLAIN_GRAMMAR', 'Giải thích ngữ pháp'],
                    ['NATIVE_EXPRESSION', 'Gợi ý cách nói tự nhiên'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Dịch nghĩa">
                <Select
                  value={settings.translationMode}
                  onChange={(value) => patch('translationMode', value)}
                  options={[
                    ['ALWAYS', 'Luôn hiển thị'],
                    ['ON_REQUEST', 'Khi yêu cầu'],
                    ['NEVER', 'Không hiển thị'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'speaking' && (
            <SectionCard title="Speaking và phát âm">
              <Field label="Giọng đọc">
                <Select
                  value={settings.accent}
                  onChange={(value) => patch('accent', value)}
                  options={[
                    ['AMERICAN', 'Mỹ'],
                    ['BRITISH', 'Anh'],
                    ['AUSTRALIAN', 'Úc'],
                    ['CANADIAN', 'Canada'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label={`Độ nhạy microphone: ${settings.micSensitivity}%`}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.micSensitivity}
                  onChange={(e) =>
                    patch('micSensitivity', Number(e.target.value))
                  }
                  className="w-full"
                />
              </Field>
              <Field label="Tự dừng khi im lặng">
                <Select
                  value={settings.autoStopSeconds ?? 0}
                  onChange={(value) =>
                    patch(
                      'autoStopSeconds',
                      Number(value) === 0 ? null : Number(value),
                    )
                  }
                  options={[
                    { value: 3, label: '3 giây' },
                    { value: 5, label: '5 giây' },
                    { value: 10, label: '10 giây' },
                    { value: 0, label: 'Không tự dừng' },
                  ]}
                />
              </Field>
              <Field label="Phụ đề">
                <Toggle
                  checked={settings.captionsEnabled}
                  onChange={(value) => patch('captionsEnabled', value)}
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'notifications' && (
            <SectionCard title="Thông báo">
              <Field label="Nhắc học hằng ngày">
                <Toggle
                  checked={settings.dailyReminderEnabled}
                  onChange={(value) =>
                    patch('dailyReminderEnabled', value)
                  }
                />
              </Field>
              <Field label="Giờ nhắc học">
                <input
                  type="time"
                  disabled={!settings.dailyReminderEnabled}
                  value={settings.dailyReminderTime}
                  onChange={(e) =>
                    patch('dailyReminderTime', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                />
              </Field>
              {[
                ['missionReminder', 'Nhiệm vụ'],
                ['clubNotification', 'Hoạt động Club'],
                ['leaderboardNotification', 'Bảng xếp hạng'],
                ['aiFeedbackNotification', 'AI chấm bài xong'],
                ['pushNotification', 'Push notification'],
                ['emailNotification', 'Email'],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <Toggle
                    checked={Boolean(settings[key as keyof Settings])}
                    onChange={(value) =>
                      patch(key as keyof Settings, value as never)
                    }
                  />
                </Field>
              ))}
            </SectionCard>
          )}

          {activeTab === 'community' && (
            <SectionCard title="Cộng đồng">
              <Field label="Biệt danh">
                <input
                  value={settings.communityNickname ?? ''}
                  onChange={(e) =>
                    patch('communityNickname', e.target.value || null)
                  }
                  placeholder="Tên hiển thị trong Community"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </Field>
              <Field label="Ai có thể nhắn tin">
                <Select
                  value={settings.messagePermission}
                  onChange={(value) =>
                    patch('messagePermission', value)
                  }
                  options={[
                    ['EVERYONE', 'Mọi người'],
                    ['FRIENDS', 'Bạn bè'],
                    ['NOBODY', 'Không ai'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Tự tham gia voice room">
                <Toggle
                  checked={settings.autoJoinVoiceRoom}
                  onChange={(value) =>
                    patch('autoJoinVoiceRoom', value)
                  }
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'appearance' && (
            <SectionCard title="Giao diện và khả năng tiếp cận">
              <Field label="Chủ đề">
                <Select
                  value={settings.theme}
                  onChange={(value) => patch('theme', value)}
                  options={[
                    ['LIGHT', 'Sáng'],
                    ['DARK', 'Tối'],
                    ['SYSTEM', 'Theo hệ thống'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Cỡ chữ">
                <Select
                  value={settings.fontScale}
                  onChange={(value) =>
                    patch('fontScale', Number(value))
                  }
                  options={[
                    { value: 0.9, label: 'Nhỏ' },
                    { value: 1, label: 'Mặc định' },
                    { value: 1.15, label: 'Lớn' },
                    { value: 1.3, label: 'Rất lớn' },
                  ]}
                />
              </Field>
              <Field label="Giảm chuyển động">
                <Toggle
                  checked={settings.reduceMotion}
                  onChange={(value) => patch('reduceMotion', value)}
                />
              </Field>
              <Field label="Tương phản cao">
                <Toggle
                  checked={settings.highContrast}
                  onChange={(value) => patch('highContrast', value)}
                />
              </Field>
              <Field label="Chế độ gọn">
                <Toggle
                  checked={settings.compactMode}
                  onChange={(value) => patch('compactMode', value)}
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'privacy' && (
            <SectionCard title="Quyền riêng tư">
              {[
                ['publicProfile', 'Hồ sơ công khai'],
                ['showStreak', 'Hiển thị streak'],
                ['showAchievements', 'Hiển thị thành tích'],
                ['allowFriendRequests', 'Cho phép kết bạn'],
                ['allowClubInvites', 'Cho phép mời vào Club'],
                ['showOnlineStatus', 'Hiển thị đang online'],
                ['showLastSeen', 'Hiển thị lần hoạt động cuối'],
                ['dataPersonalization', 'Cá nhân hóa bằng dữ liệu học'],
                ['analyticsConsent', 'Cho phép phân tích sử dụng'],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <Toggle
                    checked={Boolean(settings[key as keyof Settings])}
                    onChange={(value) =>
                      patch(key as keyof Settings, value as never)
                    }
                  />
                </Field>
              ))}
            </SectionCard>
          )}

          {activeTab === 'security' && (
            <>
              <SectionCard title="Bảo mật tài khoản">
                <Field label="Xác thực hai bước">
                  <Toggle
                    checked={settings.twoFactorEnabled}
                    onChange={() =>
                      setMessage(
                        '2FA cần kết nối với module Auth/OTP hiện có.',
                      )
                    }
                  />
                </Field>
                <Field label="Xuất dữ liệu cài đặt">
                  <a
                    href={settingsApi.exportUrl}
                    className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                  >
                    Tải JSON
                  </a>
                </Field>
              </SectionCard>

              <SectionCard title="Thiết bị đăng nhập">
                {devices.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Chưa có dữ liệu thiết bị.
                  </p>
                )}
                {devices?.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {device.deviceName}
                        {device.current && (
                          <span className="ml-2 text-xs text-emerald-600">
                            Thiết bị này
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {[device.browser, device.os, device.ipAddress]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {!device.current && (
                      <button
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                        onClick={async () => {
                          await settingsApi.revokeDevice(device.id);
                          setDevices((current) =>
                            current.filter((item) => item.id !== device.id),
                          );
                        }}
                      >
                        Đăng xuất
                      </button>
                    )}
                  </div>
                ))}
              </SectionCard>
            </>
          )}

          {activeTab === 'advanced' && (
            <SectionCard
              title="Tính năng thông minh"
              description="Những đề xuất giúp PoppyLingo khác biệt với web học thông thường."
            >
              <Field
                label="Learning DNA"
                description="Phân tích thời điểm học tốt nhất, kỹ năng mạnh/yếu và khả năng ghi nhớ."
              >
                <Toggle
                  checked={settings.learningDnaEnabled}
                  onChange={(value) =>
                    patch('learningDnaEnabled', value)
                  }
                />
              </Field>
              <Field
                label="Focus Mode"
                description="Ẩn hoạt động cộng đồng, bảng xếp hạng và thông báo gây xao nhãng."
              >
                <Toggle
                  checked={settings.focusMode}
                  onChange={(value) => patch('focusMode', value)}
                />
              </Field>
              <Field
                label="Energy Mode"
                description="Tự giảm độ khó khi hiệu suất học giảm hoặc học vào khung giờ muộn."
              >
                <Toggle
                  checked={settings.energyMode}
                  onChange={(value) => patch('energyMode', value)}
                />
              </Field>
              <Field
                label="Dashboard thích nghi"
                description="Tự ưu tiên kỹ năng và bài học theo mục tiêu hiện tại."
              >
                <Toggle
                  checked={settings.adaptiveDashboard}
                  onChange={(value) =>
                    patch('adaptiveDashboard', value)
                  }
                />
              </Field>
            </SectionCard>
          )}
        </main>
      </div>
    </div>
  );
}
