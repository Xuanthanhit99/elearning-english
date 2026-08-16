import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  VocabularyProgressCard,
  VocabularySkeleton,
  VocabularyStateCard,
  VocabularyStatsRow,
} from '../../../features/vocabulary/components/VocabularyComponents';
import {
  useTodayVocabularyQuery,
  useVocabularyStatsQuery,
} from '../../../features/vocabulary/hooks/useVocabularyQueries';
import { vocabularyKeys } from '../../../features/vocabulary/query-keys';
import { getPrimaryCta, getVocabularyProgress } from '../../../features/vocabulary/utils/vocabulary-utils';
import { colors, spacing } from '../../../theme';

export default function VocabularyOverviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const todayQuery = useTodayVocabularyQuery();
  const statsQuery = useVocabularyStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const progress = useMemo(
    () => getVocabularyProgress(todayQuery.data?.words ?? [], todayQuery.data),
    [todayQuery.data],
  );
  const cta = getPrimaryCta(todayQuery.data, progress.percent);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.today() }),
        queryClient.invalidateQueries({ queryKey: vocabularyKeys.stats() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (todayQuery.isLoading && !todayQuery.data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <VocabularySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const today = todayQuery.data;
  const canOpenSession = Boolean(today?.id && !today.locked);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              Từ vựng
            </AppText>
            <AppText variant="title">Bài học hôm nay</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="albums-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {todayQuery.error && !today ? (
          <VocabularyStateCard
            title="Không thể tải từ vựng"
            body="Kéo xuống để thử lại hoặc kiểm tra kết nối API."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void refresh()}>Thử lại</AppButton>}
          />
        ) : null}

        {today?.locked ? (
          <VocabularyStateCard
            title="Bài học hôm nay đang khóa"
            body={today.reason ?? 'Backend chưa mở bài học từ vựng hôm nay.'}
            icon="lock-closed-outline"
          />
        ) : null}

        {today && !today.locked ? (
          <>
            <VocabularyProgressCard
              completed={progress.learned}
              total={progress.total}
              remaining={progress.remaining}
              percent={progress.percent}
            />
            <VocabularyStatsRow stats={statsQuery.data} />
            {today.topic ? (
              <VocabularyStateCard
                title={today.topic.name}
                body={today.topic.description ?? 'Chủ đề từ vựng được chọn bởi backend cho hôm nay.'}
                icon="leaf-outline"
              />
            ) : null}
            <AppButton disabled={!canOpenSession} onPress={() => router.push('/learning/vocabulary/session')}>
              {cta}
            </AppButton>
          </>
        ) : null}

        {!today && !todayQuery.error ? (
          <VocabularyStateCard
            title="Chưa có bài học hôm nay"
            body="Backend chưa trả về phiên từ vựng. Hãy thử tải lại sau."
            action={<AppButton onPress={() => void refresh()}>Tải lại</AppButton>}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
});
