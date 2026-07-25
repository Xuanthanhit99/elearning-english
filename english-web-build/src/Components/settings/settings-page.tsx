'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { BeaconVieState } from '@/src/Components/UI/BeaconVie';
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
  const [loadError, setLoadError] = useState(false);

  const loadSettings = () => {
    setLoadError(false);
    Promise.all([
      settingsApi.get(),
      settingsApi.getDevices().catch(() => []),
    ])
      .then(([settingsData, deviceData]) => {
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
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <BeaconVieState
          title="KhÃ´ng táº£i Ä‘Æ°á»£c cÃ i Ä‘áº·t"
          description="ÄÃ£ xáº£y ra lá»—i khi táº£i cÃ i Ä‘áº·t tÃ i khoáº£n. Vui lÃ²ng thá»­ láº¡i."
          actionLabel="Thá»­ láº¡i"
          onAction={loadSettings}
          tone="error"
        />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-sm font-semibold text-[var(--BeaconVie-muted)]">{t('common.loading')}</div>
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
      setMessage(error instanceof Error ? error.message : 'KhÃ´ng khá»Ÿi táº¡o Ä‘Æ°á»£c 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (twoFactorOtp.trim().length !== 6) {
      setMessage('Vui lÃ²ng nháº­p mÃ£ OTP gá»“m 6 sá»‘.');
      return;
    }

    setTwoFactorBusy(true);
    setMessage('');
    try {
      const result = await twoFactorApi.confirm(twoFactorOtp.trim());
      setTwoFactorRecoveryCodes(result.recoveryCodes);
      await refreshSettings();
      setMessage('ÄÃ£ báº­t xÃ¡c thá»±c hai bÆ°á»›c.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'MÃ£ OTP khÃ´ng Ä‘Ãºng.');
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
      setMessage('ÄÃ£ táº¯t xÃ¡c thá»±c hai bÆ°á»›c.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ táº¯t 2FA.');
    } finally {
      setTwoFactorBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--BeaconVie-primary)]">
            <SlidersHorizontal className="h-4 w-4" />
            {t('settings.badge')}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--BeaconVie-ink)]">
            {t('settings.title')}
          </h1>
          <p className="mt-2 font-semibold text-[var(--BeaconVie-muted)]">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm font-semibold text-[var(--BeaconVie-muted)]">{message}</span>
          )}
          <button
            onClick={reset}
            className="BeaconVie-button-soft px-4 py-2 text-sm font-semibold"
          >
            {t('settings.reset')}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="BeaconVie-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="BeaconVie-card flex gap-2 overflow-x-auto p-2 lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-[var(--BeaconVie-primary-soft)] text-[var(--BeaconVie-primary)]'
                      : 'text-[var(--BeaconVie-muted)] hover:bg-[var(--BeaconVie-hover-tint)]'
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
                title="Má»¥c tiÃªu há»c táº­p"
                description="DÃ¹ng Ä‘á»ƒ Æ°u tiÃªn ná»™i dung trÃªn Dashboard vÃ  táº¡o lá»™ trÃ¬nh."
              >
                <Field label="Má»¥c tiÃªu chÃ­nh">
                  <Select
                    value={settings.learningGoal}
                    onChange={(value) => patch('learningGoal', value)}
                    options={[
                      ['DAILY_ENGLISH', 'Giao tiáº¿p háº±ng ngÃ y'],
                      ['IELTS', 'IELTS'],
                      ['TOEIC', 'TOEIC'],
                      ['SPEAKING', 'Speaking'],
                      ['BUSINESS_ENGLISH', 'Tiáº¿ng Anh cÃ´ng viá»‡c'],
                      ['TRAVEL', 'Du lá»‹ch'],
                      ['GRAMMAR', 'Ngá»¯ phÃ¡p'],
                      ['VOCABULARY', 'Tá»« vá»±ng'],
                    ].map(([value, label]) => ({ value, label }))}
                  />
                </Field>
                <Field label="Thá»i lÆ°á»£ng má»—i ngÃ y">
                  <Select
                    value={settings.dailyStudyMinutes}
                    onChange={(value) =>
                      patch('dailyStudyMinutes', Number(value))
                    }
                    options={[10, 20, 30, 45, 60].map((value) => ({
                      value,
                      label: `${value} phÃºt`,
                    }))}
                  />
                </Field>
                <Field label="TrÃ¬nh Ä‘á»™ hiá»‡n táº¡i">
                  <Select
                    value={settings.currentLevel}
                    onChange={(value) => patch('currentLevel', value)}
                    options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(
                      (value) => ({ value, label: value }),
                    )}
                  />
                </Field>
                <Field
                  label="Tá»± Ä‘á»™ng Ä‘Ã¡nh giÃ¡ trÃ¬nh Ä‘á»™"
                  description="Äiá»u chá»‰nh Ä‘á»™ khÃ³ tá»« káº¿t quáº£ Placement Test vÃ  tiáº¿n Ä‘á»™."
                >
                  <Toggle
                    checked={settings.autoDetectLevel}
                    onChange={(value) =>
                      patch('autoDetectLevel', value)
                    }
                  />
                </Field>
              </SectionCard>

              <SectionCard title="Lá»‹ch há»c">
                <Field label="Má»¥c tiÃªu sá»‘ ngÃ y má»—i tuáº§n">
                  <Select
                    value={settings.weeklyTargetDays}
                    onChange={(value) =>
                      patch('weeklyTargetDays', Number(value))
                    }
                    options={[3, 4, 5, 6, 7].map((value) => ({
                      value,
                      label: `${value} ngÃ y`,
                    }))}
                  />
                </Field>
                <Field label="Giá» há»c Æ°a thÃ­ch">
                  <input
                    type="time"
                    value={settings.preferredStudyTime}
                    onChange={(e) =>
                      patch('preferredStudyTime', e.target.value)
                    }
                    className="BeaconVie-input w-full px-3 py-2"
                  />
                </Field>
                <Field
                  label="AI tá»± sáº¯p lá»‹ch"
                  description="Tá»± Ä‘á» xuáº¥t khung giá» phÃ¹ há»£p dá»±a trÃªn Learning DNA."
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
              description="CÃ¡ nhÃ¢n hÃ³a phong cÃ¡ch pháº£n há»“i vÃ  sá»­a lá»—i."
            >
              <Field label="GiÃ¡o viÃªn AI">
                <Select
                  value={settings.aiTeacher}
                  onChange={(value) => patch('aiTeacher', value)}
                  options={['Emily', 'David', 'Emma', 'Sophia'].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              </Field>
              <Field label="TÃ­nh cÃ¡ch AI">
                <Select
                  value={settings.aiPersonality}
                  onChange={(value) => patch('aiPersonality', value)}
                  options={[
                    ['TEACHER', 'GiÃ¡o viÃªn'],
                    ['COACH', 'Huáº¥n luyá»‡n viÃªn'],
                    ['FRIEND', 'Báº¡n Ä‘á»“ng hÃ nh'],
                    ['STRICT_MENTOR', 'NgÆ°á»i hÆ°á»›ng dáº«n nghiÃªm tÃºc'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Cháº¿ Ä‘á»™ sá»­a lá»—i">
                <Select
                  value={settings.correctionMode}
                  onChange={(value) => patch('correctionMode', value)}
                  options={[
                    ['MAJOR_ONLY', 'Chá»‰ sá»­a lá»—i quan trá»ng'],
                    ['CORRECT_EVERYTHING', 'Sá»­a má»i lá»—i'],
                    ['EXPLAIN_GRAMMAR', 'Giáº£i thÃ­ch ngá»¯ phÃ¡p'],
                    ['NATIVE_EXPRESSION', 'Gá»£i Ã½ cÃ¡ch nÃ³i tá»± nhiÃªn'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Dá»‹ch nghÄ©a">
                <Select
                  value={settings.translationMode}
                  onChange={(value) => patch('translationMode', value)}
                  options={[
                    ['ALWAYS', 'LuÃ´n hiá»ƒn thá»‹'],
                    ['ON_REQUEST', 'Khi yÃªu cáº§u'],
                    ['NEVER', 'KhÃ´ng hiá»ƒn thá»‹'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'speaking' && (
            <SectionCard title="Speaking vÃ  phÃ¡t Ã¢m">
              <Field label="Giá»ng Ä‘á»c">
                <Select
                  value={settings.accent}
                  onChange={(value) => patch('accent', value)}
                  options={[
                    ['AMERICAN', 'Má»¹'],
                    ['BRITISH', 'Anh'],
                    ['AUSTRALIAN', 'Ãšc'],
                    ['CANADIAN', 'Canada'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label={`Äá»™ nháº¡y microphone: ${settings.micSensitivity}%`}>
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
              <Field label="Tá»± dá»«ng khi im láº·ng">
                <Select
                  value={settings.autoStopSeconds ?? 0}
                  onChange={(value) =>
                    patch(
                      'autoStopSeconds',
                      Number(value) === 0 ? null : Number(value),
                    )
                  }
                  options={[
                    { value: 3, label: '3 giÃ¢y' },
                    { value: 5, label: '5 giÃ¢y' },
                    { value: 10, label: '10 giÃ¢y' },
                    { value: 0, label: 'KhÃ´ng tá»± dá»«ng' },
                  ]}
                />
              </Field>
              <Field label="Phá»¥ Ä‘á»">
                <Toggle
                  checked={settings.captionsEnabled}
                  onChange={(value) => patch('captionsEnabled', value)}
                />
              </Field>
            </SectionCard>
          )}

          {activeTab === 'notifications' && (
            <SectionCard title="ThÃ´ng bÃ¡o">
              <Field label="Nháº¯c há»c háº±ng ngÃ y">
                <Toggle
                  checked={settings.dailyReminderEnabled}
                  onChange={(value) =>
                    patch('dailyReminderEnabled', value)
                  }
                />
              </Field>
              <Field label="Giá» nháº¯c há»c">
                <input
                  type="time"
                  disabled={!settings.dailyReminderEnabled}
                  value={settings.dailyReminderTime}
                  onChange={(e) =>
                    patch('dailyReminderTime', e.target.value)
                  }
                  className="BeaconVie-input w-full px-3 py-2 disabled:opacity-50"
                />
              </Field>
              {[
                ['missionReminder', 'Nhiá»‡m vá»¥'],
                ['clubNotification', 'Hoáº¡t Ä‘á»™ng Club'],
                ['leaderboardNotification', 'Báº£ng xáº¿p háº¡ng'],
                ['aiFeedbackNotification', 'AI cháº¥m bÃ i xong'],
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
            <SectionCard title="Cá»™ng Ä‘á»“ng">
              <Field label="Biá»‡t danh">
                <input
                  value={settings.communityNickname ?? ''}
                  onChange={(e) =>
                    patch('communityNickname', e.target.value || null)
                  }
                  placeholder="TÃªn hiá»ƒn thá»‹ trong Community"
                  className="BeaconVie-input w-full px-3 py-2"
                />
              </Field>
              <Field label="Ai cÃ³ thá»ƒ nháº¯n tin">
                <Select
                  value={settings.messagePermission}
                  onChange={(value) =>
                    patch('messagePermission', value)
                  }
                  options={[
                    ['EVERYONE', 'Má»i ngÆ°á»i'],
                    ['FRIENDS', 'Báº¡n bÃ¨'],
                    ['NOBODY', 'KhÃ´ng ai'],
                  ].map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Tá»± tham gia voice room">
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
            <SectionCard title="Quyá»n riÃªng tÆ°">
              {[
                ['publicProfile', 'Há»“ sÆ¡ cÃ´ng khai'],
                ['showStreak', 'Hiá»ƒn thá»‹ streak'],
                ['showAchievements', 'Hiá»ƒn thá»‹ thÃ nh tÃ­ch'],
                ['allowFriendRequests', 'Cho phÃ©p káº¿t báº¡n'],
                ['allowClubInvites', 'Cho phÃ©p má»i vÃ o Club'],
                ['showOnlineStatus', 'Hiá»ƒn thá»‹ Ä‘ang online'],
                ['showLastSeen', 'Hiá»ƒn thá»‹ láº§n hoáº¡t Ä‘á»™ng cuá»‘i'],
                ['dataPersonalization', 'CÃ¡ nhÃ¢n hÃ³a báº±ng dá»¯ liá»‡u há»c'],
                ['analyticsConsent', 'Cho phÃ©p phÃ¢n tÃ­ch sá»­ dá»¥ng'],
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
              <ChangePasswordCard />

              <SectionCard title="Báº£o máº­t tÃ i khoáº£n">
                <Field label="XÃ¡c thá»±c hai bÆ°á»›c">
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
                <Field label="Xuáº¥t dá»¯ liá»‡u cÃ i Ä‘áº·t">
                  <a
                    href={settingsApi.exportUrl}
                    className="inline-flex BeaconVie-button-soft px-4 py-2 text-sm font-semibold"
                  >
                    Táº£i JSON
                  </a>
                </Field>
              </SectionCard>

              <SectionCard title="Thiáº¿t bá»‹ Ä‘Äƒng nháº­p">
                {devices.length === 0 && (
                  <p className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
                    ChÆ°a cÃ³ dá»¯ liá»‡u thiáº¿t bá»‹.
                  </p>
                )}
                {devices?.map((device) => (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--BeaconVie-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {device.deviceName}
                        {device.current && (
                          <span className="ml-2 text-xs text-emerald-600">
                            Thiáº¿t bá»‹ nÃ y
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--BeaconVie-muted)]">
                        {[device.browser, device.os, device.ipAddress]
                          .filter(Boolean)
                          .join(' Â· ')}
                      </div>
                    </div>
                    {!device.current && (
                      <button
                        className="rounded-xl border border-[var(--BeaconVie-danger)]/30 px-3 py-2 text-sm font-semibold text-[var(--BeaconVie-danger)]"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `ÄÄƒng xuáº¥t thiáº¿t bá»‹ "${device.deviceName}"? Thiáº¿t bá»‹ nÃ y sáº½ cáº§n Ä‘Äƒng nháº­p láº¡i.`,
                          );
                          if (!confirmed) return;
                          try {
                            await settingsApi.revokeDevice(device.id);
                            setDevices((current) =>
                              current.filter((item) => item.id !== device.id),
                            );
                          } catch {
                            setMessage('KhÃ´ng Ä‘Äƒng xuáº¥t Ä‘Æ°á»£c thiáº¿t bá»‹ nÃ y. Vui lÃ²ng thá»­ láº¡i.');
                          }
                        }}
                      >
                        ÄÄƒng xuáº¥t
                      </button>
                    )}
                  </div>
                ))}
              </SectionCard>
            </>
          )}

          {activeTab === 'advanced' && (
            <SectionCard
              title="TÃ­nh nÄƒng thÃ´ng minh"
              description="Nhá»¯ng Ä‘á» xuáº¥t giÃºp BeaconVie khÃ¡c biá»‡t vá»›i web há»c thÃ´ng thÆ°á»ng."
            >
              <Field
                label="Learning DNA"
                description="PhÃ¢n tÃ­ch thá»i Ä‘iá»ƒm há»c tá»‘t nháº¥t, ká»¹ nÄƒng máº¡nh/yáº¿u vÃ  kháº£ nÄƒng ghi nhá»›."
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
                description="áº¨n hoáº¡t Ä‘á»™ng cá»™ng Ä‘á»“ng, báº£ng xáº¿p háº¡ng vÃ  thÃ´ng bÃ¡o gÃ¢y xao nhÃ£ng."
              >
                <Toggle
                  checked={settings.focusMode}
                  onChange={(value) => patch('focusMode', value)}
                />
              </Field>
              <Field
                label="Energy Mode"
                description="Tá»± giáº£m Ä‘á»™ khÃ³ khi hiá»‡u suáº¥t há»c giáº£m hoáº·c há»c vÃ o khung giá» muá»™n."
              >
                <Toggle
                  checked={settings.energyMode}
                  onChange={(value) => patch('energyMode', value)}
                />
              </Field>
              <Field
                label="Dashboard thÃ­ch nghi"
                description="Tá»± Æ°u tiÃªn ká»¹ nÄƒng vÃ  bÃ i há»c theo má»¥c tiÃªu hiá»‡n táº¡i."
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--BeaconVie-overlay)] p-4">
          <div className="BeaconVie-card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
                  Báº­t xÃ¡c thá»±c hai bÆ°á»›c
                </h2>
                <p className="mt-1 text-sm font-semibold text-[var(--BeaconVie-muted)]">
                  QuÃ©t mÃ£ QR báº±ng Google Authenticator, Authy hoáº·c á»©ng dá»¥ng OTP tÆ°Æ¡ng tá»±.
                </p>
              </div>
              <button
                className="BeaconVie-button-soft px-3 py-1 text-sm font-semibold"
                onClick={() => setTwoFactorSetup(null)}
              >
                ÄÃ³ng
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-[var(--BeaconVie-border)] bg-[var(--BeaconVie-card-soft)] p-3">
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
                  <div className="text-sm font-semibold text-[var(--BeaconVie-ink)]">
                    MÃ£ nháº­p thá»§ cÃ´ng
                  </div>
                  <code className="mt-2 block break-all rounded-xl bg-[var(--BeaconVie-card-soft)] p-3 text-xs">
                    {twoFactorSetup.manualEntryKey}
                  </code>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--BeaconVie-ink)]">
                    Nháº­p mÃ£ OTP 6 sá»‘
                  </label>
                  <input
                    value={twoFactorOtp}
                    onChange={(event) => setTwoFactorOtp(event.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    className="mt-2 BeaconVie-input w-full px-3 py-2"
                    placeholder="123456"
                  />
                </div>
              </div>
            </div>

            {twoFactorRecoveryCodes.length > 0 && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="font-bold">Recovery codes - chá»‰ hiá»ƒn thá»‹ má»™t láº§n</div>
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
                className="BeaconVie-button-soft px-4 py-2 text-sm font-semibold"
                onClick={() => setTwoFactorSetup(null)}
              >
                Äá»ƒ sau
              </button>
              <button
                disabled={twoFactorBusy || twoFactorRecoveryCodes.length > 0}
                className="BeaconVie-button-primary px-5 py-2 text-sm disabled:opacity-60"
                onClick={confirmTwoFactor}
              >
                {twoFactorBusy ? 'Äang xÃ¡c minh...' : 'XÃ¡c nháº­n báº­t 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {twoFactorDisableOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--BeaconVie-overlay)] p-4">
          <div className="BeaconVie-card w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-[var(--BeaconVie-ink)]">
              Táº¯t xÃ¡c thá»±c hai bÆ°á»›c
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--BeaconVie-muted)]">
              Nháº­p máº­t kháº©u, mÃ£ OTP hoáº·c recovery code Ä‘á»ƒ xÃ¡c minh.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="password"
                placeholder="Máº­t kháº©u"
                value={twoFactorDisablePayload.password}
                onChange={(event) =>
                  setTwoFactorDisablePayload((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="BeaconVie-input w-full px-3 py-2"
              />
              <input
                placeholder="MÃ£ OTP"
                maxLength={6}
                inputMode="numeric"
                value={twoFactorDisablePayload.otp}
                onChange={(event) =>
                  setTwoFactorDisablePayload((current) => ({
                    ...current,
                    otp: event.target.value,
                  }))
                }
                className="BeaconVie-input w-full px-3 py-2"
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
                className="BeaconVie-input w-full px-3 py-2"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="BeaconVie-button-soft px-4 py-2 text-sm font-semibold"
                onClick={() => setTwoFactorDisableOpen(false)}
              >
                Há»§y
              </button>
              <button
                disabled={twoFactorBusy}
                className="rounded-xl bg-[var(--BeaconVie-danger)] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                onClick={disableTwoFactor}
              >
                {twoFactorBusy ? 'Äang táº¯t...' : 'Táº¯t 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = (error.response as { data?: unknown }).data as
      | { message?: unknown }
      | undefined;
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}

/**
 * Changing a password revokes every session for the account (see
 * AuthService.changePassword's comment â€” the access-token payload carries no
 * session id, so there's no safe way to tell "this device" apart from any
 * other live session), including the one making this request. A successful
 * change therefore always ends in a redirect to /login, not a toast.
 */
function ChangePasswordCard() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError('');

    if (newPassword.length < 6) {
      setError('Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Máº­t kháº©u xÃ¡c nháº­n khÃ´ng khá»›p.');
      return;
    }

    setSubmitting(true);
    try {
      await settingsApi.changePassword(currentPassword, newPassword);
      setDone(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'KhÃ´ng Ä‘á»•i Ä‘Æ°á»£c máº­t kháº©u. Vui lÃ²ng thá»­ láº¡i.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SectionCard title="Äá»•i máº­t kháº©u">
        <p className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
          Äá»•i máº­t kháº©u thÃ nh cÃ´ng. Má»i phiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ bá»‹ Ä‘Äƒng xuáº¥t â€” Ä‘ang
          chuyá»ƒn Ä‘áº¿n trang Ä‘Äƒng nháº­p...
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Äá»•i máº­t kháº©u">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
            Máº­t kháº©u hiá»‡n táº¡i
          </span>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="BeaconVie-input mt-1 w-full px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
            Máº­t kháº©u má»›i
          </span>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="BeaconVie-input mt-1 w-full px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--BeaconVie-muted)]">
            XÃ¡c nháº­n máº­t kháº©u má»›i
          </span>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="BeaconVie-input mt-1 w-full px-3 py-2"
          />
        </label>

        {error && (
          <p className="text-sm font-semibold text-[var(--BeaconVie-danger)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[var(--BeaconVie-primary)] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'Äang Ä‘á»•i...' : 'Äá»•i máº­t kháº©u'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
