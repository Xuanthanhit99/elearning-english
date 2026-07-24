'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
} from 'lucide-react';
import { Field, SectionCard, Select, Toggle } from './ui';
import { DeviceSession, Settings } from '@/src/lib/settings-types';
import { settingsApi, twoFactorApi } from '@/src/lib/settings-api';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useThemeStore, ThemeChoice } from '@/src/store/themeStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { LOCALES, LOCALE_LABELS, Locale } from '@/src/i18n/types';
import { features } from '@/src/config/features';

const tabs = [
  { id: 'learning', icon: Brain },
  { id: 'ai', icon: Bot },
  { id: 'speaking', icon: Mic },
  { id: 'notifications', icon: Bell },
  { id: 'community', icon: MessageCircle },
  { id: 'appearance', icon: Brush },
  { id: 'privacy', icon: Shield },
  { id: 'security', icon: Lock },
  { id: 'advanced', icon: Sparkles },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const { t } = useTranslation();
  const setTheme = useThemeStore((state) => state.setTheme);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const tabLabels: Record<TabId, string> = {
    learning: t('settings.tabLearning'),
    ai: t('settings.tabAi'),
    speaking: t('settings.tabSpeaking'),
    notifications: t('settings.tabNotifications'),
    community: t('settings.tabCommunity'),
    appearance: t('settings.tabAppearance'),
    privacy: t('settings.tabPrivacy'),
    security: t('settings.tabSecurity'),
    advanced: t('settings.tabAdvanced'),
  };
  const [settings, setSettings] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('learning');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    qrCodeDataUrl: string;
    manualEntryKey: string;
  } | null>(null);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = useState(false);
  const [twoFactorDisablePayload, setTwoFactorDisablePayload] = useState({
    password: '',
    otp: '',
    recoveryCode: '',
  });
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      settingsApi.getDevices().catch(() => []),
    ]).then(([settingsData, deviceData]) => {
      setSettings(settingsData);
      setDevices(deviceData);
      // Keep the global theme/language stores (used across the whole app)
      // in sync with whatever was last saved for this account.
      if (settingsData.theme) {
        setTheme(settingsData.theme as ThemeChoice);
      }
      if (settingsData.language) {
        setLocale(settingsData.language.toLowerCase() as Locale);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!settings) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-sm font-semibold text-[var(--lumiverse-muted)]">{t('common.loading')}</div>
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
    // Live-preview theme/language immediately, instead of waiting for Save.
    if (key === 'theme') setTheme(value as unknown as ThemeChoice);
    if (key === 'language') setLocale((value as unknown as string).toLowerCase() as Locale);
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated =
        activeTab === 'notifications'
          ? await settingsApi.updateNotifications({
              dailyReminderEnabled: settings.dailyReminderEnabled,
              dailyReminderTime: settings.dailyReminderTime,
              missionReminder: settings.missionReminder,
              friendActivity: settings.friendActivity,
              clubNotification: settings.clubNotification,
              leaderboardNotification: settings.leaderboardNotification,
              aiFeedbackNotification: settings.aiFeedbackNotification,
              emailNotification: settings.emailNotification,
              pushNotification: settings.pushNotification,
            })
          : await settingsApi.update(settings);
      setSettings(updated);
      setMessage(t('settings.savedMessage'));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Error',
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
    setMessage(t('settings.resetMessage'));
  };

  const refreshSettings = async () => {
    const updated = await settingsApi.get();
    setSettings(updated);
  };

  const startTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    setMessage('');
    try {
      const setup = await twoFactorApi.setup();
      setTwoFactorSetup(setup);
      setTwoFactorOtp('');
      setTwoFactorRecoveryCodes([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không khởi tạo được 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (twoFactorOtp.trim().length !== 6) {
      setMessage('Vui lòng nhập mã OTP gồm 6 số.');
      return;
    }

    setTwoFactorBusy(true);
    setMessage('');
    try {
      const result = await twoFactorApi.confirm(twoFactorOtp.trim());
      setTwoFactorRecoveryCodes(result.recoveryCodes);
      await refreshSettings();
      setMessage('Đã bật xác thực hai bước.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mã OTP không đúng.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorBusy(true);
    setMessage('');
    try {
      await twoFactorApi.disable({
        password: twoFactorDisablePayload.password || undefined,
        otp: twoFactorDisablePayload.otp || undefined,
        recoveryCode: twoFactorDisablePayload.recoveryCode || undefined,
      });
      setTwoFactorDisableOpen(false);
      setTwoFactorDisablePayload({ password: '', otp: '', recoveryCode: '' });
      await refreshSettings();
      setMessage('Đã tắt xác thực hai bước.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tắt 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--lumiverse-primary)]">
            <SlidersHorizontal className="h-4 w-4" />
            {t('settings.badge')}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--lumiverse-ink)]">
            {t('settings.title')}
          </h1>
          <p className="mt-2 font-semibold text-[var(--lumiverse-muted)]">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm font-semibold text-[var(--lumiverse-muted)]">{message}</span>
          )}
          <button
            onClick={reset}
            className="lumiverse-button-soft px-4 py-2 text-sm font-semibold"
          >
            {t('settings.reset')}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="lumiverse-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="lumiverse-card flex gap-2 overflow-x-auto p-2 lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-[var(--lumiverse-primary-soft)] text-[var(--lumiverse-primary)]'
                      : 'text-[var(--lumiverse-muted)] hover:bg-[var(--lumiverse-hover-tint)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tabLabels[tab.id]}
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
                    className="lumiverse-input w-full px-3 py-2"
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
                  className="lumiverse-input w-full px-3 py-2 disabled:opacity-50"
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
                  className="lumiverse-input w-full px-3 py-2"
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
            <SectionCard title={t('settings.appearanceTitle')}>
              <Field label={t('settings.themeLabel')}>
                <Select
                  value={settings.theme}
                  onChange={(value) => patch('theme', value)}
                  options={[
                    ['LIGHT', t('theme.light')],
                    ['DARK', t('theme.dark')],
                    ['SYSTEM', t('theme.system')],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              {features.languageSwitcher ? (
                <Field
                  label={t('settings.languageLabel')}
                  description={t('settings.languageDescription')}
                >
                  <Select
                    value={(settings.language || 'vi').toLowerCase()}
                    onChange={(value) => patch('language', value.toUpperCase())}
                    options={LOCALES.map((locale) => ({
                      value: locale,
                      label: LOCALE_LABELS[locale],
                    }))}
                  />
                </Field>
              ) : null}
              <Field label={t('settings.fontScaleLabel')}>
                <Select
                  value={settings.fontScale}
                  onChange={(value) =>
                    patch('fontScale', Number(value))
                  }
                  options={[
                    { value: 0.9, label: t('settings.fontScaleSmall') },
                    { value: 1, label: t('settings.fontScaleDefault') },
                    { value: 1.15, label: t('settings.fontScaleLarge') },
                    { value: 1.3, label: t('settings.fontScaleXLarge') },
                  ]}
                />
              </Field>
              <Field label={t('settings.reduceMotionLabel')}>
                <Toggle
                  checked={settings.reduceMotion}
                  onChange={(value) => patch('reduceMotion', value)}
                />
              </Field>
              <Field label={t('settings.highContrastLabel')}>
                <Toggle
                  checked={settings.highContrast}
                  onChange={(value) => patch('highContrast', value)}
                />
              </Field>
              <Field label={t('settings.compactModeLabel')}>
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
                    disabled={twoFactorBusy}
                    onChange={(enabled) => {
                      if (enabled) {
                        void startTwoFactorSetup();
                      } else {
                        setTwoFactorDisableOpen(true);
                      }
                    }}
                  />
                </Field>
                <Field label="Xuất dữ liệu cài đặt">
                  <a
                    href={settingsApi.exportUrl}
                    className="inline-flex lumiverse-button-soft px-4 py-2 text-sm font-semibold"
                  >
                    Tải JSON
                  </a>
                </Field>
              </SectionCard>

              <SectionCard title="Thiết bị đăng nhập">
                {devices.length === 0 && (
                  <p className="text-sm font-semibold text-[var(--lumiverse-muted)]">
                    Chưa có dữ liệu thiết bị.
                  </p>
                )}
                {devices?.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--lumiverse-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
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
                      <div className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">
                        {[device.browser, device.os, device.ipAddress]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {!device.current && (
                      <button
                        className="rounded-xl border border-[var(--lumiverse-danger)]/30 px-3 py-2 text-sm font-semibold text-[var(--lumiverse-danger)]"
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
              description="Những đề xuất giúp Lumiverse khác biệt với web học thông thường."
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

      {twoFactorSetup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--lumiverse-overlay)] p-4">
          <div className="lumiverse-card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
                  Bật xác thực hai bước
                </h2>
                <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">
                  Quét mã QR bằng Google Authenticator, Authy hoặc ứng dụng OTP tương tự.
                </p>
              </div>
              <button
                className="lumiverse-button-soft px-3 py-1 text-sm font-semibold"
                onClick={() => setTwoFactorSetup(null)}
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-[var(--lumiverse-border)] bg-[var(--lumiverse-card-soft)] p-3">
                <Image
                  src={twoFactorSetup.qrCodeDataUrl}
                  alt="2FA QR code"
                  width={156}
                  height={156}
                  unoptimized
                  className="h-full w-full rounded-xl"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--lumiverse-ink)]">
                    Mã nhập thủ công
                  </div>
                  <code className="mt-2 block break-all rounded-xl bg-[var(--lumiverse-card-soft)] p-3 text-xs">
                    {twoFactorSetup.manualEntryKey}
                  </code>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--lumiverse-ink)]">
                    Nhập mã OTP 6 số
                  </label>
                  <input
                    value={twoFactorOtp}
                    onChange={(event) => setTwoFactorOtp(event.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    className="mt-2 lumiverse-input w-full px-3 py-2"
                    placeholder="123456"
                  />
                </div>
              </div>
            </div>

            {twoFactorRecoveryCodes.length > 0 && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="font-bold">Recovery codes - chỉ hiển thị một lần</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {twoFactorRecoveryCodes.map((code) => (
                    <code key={code} className="rounded-lg bg-white px-2 py-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="lumiverse-button-soft px-4 py-2 text-sm font-semibold"
                onClick={() => setTwoFactorSetup(null)}
              >
                Để sau
              </button>
              <button
                disabled={twoFactorBusy || twoFactorRecoveryCodes.length > 0}
                className="lumiverse-button-primary px-5 py-2 text-sm disabled:opacity-60"
                onClick={confirmTwoFactor}
              >
                {twoFactorBusy ? 'Đang xác minh...' : 'Xác nhận bật 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {twoFactorDisableOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--lumiverse-overlay)] p-4">
          <div className="lumiverse-card w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-[var(--lumiverse-ink)]">
              Tắt xác thực hai bước
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--lumiverse-muted)]">
              Nhập mật khẩu, mã OTP hoặc recovery code để xác minh.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="password"
                placeholder="Mật khẩu"
                value={twoFactorDisablePayload.password}
                onChange={(event) =>
                  setTwoFactorDisablePayload((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="lumiverse-input w-full px-3 py-2"
              />
              <input
                placeholder="Mã OTP"
                maxLength={6}
                inputMode="numeric"
                value={twoFactorDisablePayload.otp}
                onChange={(event) =>
                  setTwoFactorDisablePayload((current) => ({
                    ...current,
                    otp: event.target.value,
                  }))
                }
                className="lumiverse-input w-full px-3 py-2"
              />
              <input
                placeholder="Recovery code"
                value={twoFactorDisablePayload.recoveryCode}
                onChange={(event) =>
                  setTwoFactorDisablePayload((current) => ({
                    ...current,
                    recoveryCode: event.target.value,
                  }))
                }
                className="lumiverse-input w-full px-3 py-2"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="lumiverse-button-soft px-4 py-2 text-sm font-semibold"
                onClick={() => setTwoFactorDisableOpen(false)}
              >
                Hủy
              </button>
              <button
                disabled={twoFactorBusy}
                className="rounded-xl bg-[var(--lumiverse-danger)] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                onClick={disableTwoFactor}
              >
                {twoFactorBusy ? 'Đang tắt...' : 'Tắt 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
