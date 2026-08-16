import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { ContinueLearningCard, DashboardNotice, DashboardSkeleton } from '../../features/dashboard/components/DashboardCards';
import { useDashboardQuery } from '../../features/dashboard/hooks/useDashboardQuery';
import { selectPrimaryLesson, selectSkillModules, toTabRoute } from '../../features/dashboard/utils/dashboard-utils';
import { colors, radius, spacing } from '../../theme';

const moduleCopy: Record<string, { description: string; enabled: boolean }> = {
  VOCABULARY: {
    description: 'Học từ mới, lưu tiến độ và hoàn thành bài hôm nay.',
    enabled: true,
  },
  GRAMMAR: {
    description: 'Học lý thuyết và làm bài tập chấm bởi backend.',
    enabled: true,
  },
  READING: {
    description: 'Đọc bài, trả lời câu hỏi và nhận XP từ backend.',
    enabled: true,
  },
  LISTENING: {
    description: 'Nghe audio thật, trả lời câu hỏi và nhận kết quả từ backend.',
    enabled: true,
  },
  WRITING: {
    description: 'Viet bai, luu ban nhap va nhan cham bai AI tu backend.',
    enabled: true,
  },
};

export default function LearnScreen() {
  const router = useRouter();
  const { data, error, isLoading, refetch } = useDashboardQuery();
  const primaryLesson = useMemo(() => selectPrimaryLesson(data), [data]);
  const modules = useMemo(() => selectSkillModules(data), [data]);

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <DashboardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              Học tập
            </AppText>
            <AppText variant="title">Learning Hub</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {error && !data ? (
          <DashboardNotice
            title="Chưa tải được tiến độ học"
            body="Không thể tải dữ liệu học tập. Hãy thử lại."
            action={<AppButton onPress={() => void refetch()}>Thử lại</AppButton>}
          />
        ) : null}

        {primaryLesson ? (
          <ContinueLearningCard lesson={primaryLesson} onPress={() => router.push(toTabRoute(primaryLesson.href))} />
        ) : (
          <DashboardNotice
            title="Bắt đầu hành trình của bạn"
            body="Chọn Từ vựng để tải bài học thật từ backend và lưu tiến độ theo từng từ."
            action={<AppButton onPress={() => router.push('/learning/vocabulary')}>Mở Từ vựng</AppButton>}
          />
        )}

        {data?.learningPath ? (
          <AppCard>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <AppText variant="heading">Lộ trình của bạn</AppText>
                <AppText color={colors.textMuted}>
                  {data.learningPath.title ?? 'Lộ trình học cá nhân'}
                </AppText>
              </View>
              <AppText variant="heading" color={colors.primary}>
                {data.learningPath.progressPercent ?? 0}%
              </AppText>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, data.learningPath.progressPercent ?? 0))}%` }]} />
            </View>
            <View style={styles.pathAction}>
              <AppButton onPress={() => router.push('/learning/path')}>Xem lo trinh</AppButton>
            </View>
          </AppCard>
        ) : (
          <DashboardNotice
            title="Kiem tra trinh do"
            body="Lam Placement de BeaconVie de xuat lo trinh hoc phu hop."
            action={<AppButton onPress={() => router.push('/placement')}>Mo Placement</AppButton>}
          />
        )}

        <View style={styles.section}>
          <AppText variant="heading">Kỹ năng</AppText>
          <View style={styles.moduleList}>
            {modules.map((module) => (
              <ModuleCard
                key={module.key}
                description={moduleCopy[module.key]?.description ?? 'Phiên bản mobile đang được hoàn thiện.'}
                enabled={moduleCopy[module.key]?.enabled ?? false}
                label={module.label}
                percent={module.percent}
                onPress={() =>
                  module.key === 'VOCABULARY'
                    ? router.push('/learning/vocabulary')
                    : module.key === 'GRAMMAR'
                      ? router.push('/learning/grammar')
                      : module.key === 'READING'
                        ? router.push('/learning/reading')
                        : module.key === 'LISTENING'
                          ? router.push('/learning/listening')
                          : module.key === 'WRITING'
                            ? router.push('/learning/writing')
                            : undefined
                }
              />
            ))}
            {!modules.some((module) => module.key === 'VOCABULARY') ? (
              <ModuleCard
                description="Tải bài học hôm nay từ backend."
                enabled
                label="Từ vựng"
                percent={0}
                onPress={() => router.push('/learning/vocabulary')}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({
  description,
  enabled,
  label,
  onPress,
  percent,
}: {
  description: string;
  enabled: boolean;
  label: string;
  onPress?: () => void;
  percent: number;
}) {
  return (
    <Pressable
      accessibilityRole={enabled ? 'button' : undefined}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.moduleCard, pressed ? styles.pressed : null, !enabled ? styles.disabledCard : null]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{label}</AppText>
          <AppText color={colors.textMuted}>{description}</AppText>
        </View>
        <Ionicons name={enabled ? 'chevron-forward' : 'lock-closed-outline'} size={22} color={enabled ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {percent}% tiến độ
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  pathAction: {
    marginTop: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  moduleList: {
    gap: spacing.md,
  },
  moduleCard: {
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  disabledCard: {
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.78,
  },
});
