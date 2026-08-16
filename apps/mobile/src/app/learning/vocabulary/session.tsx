import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  VocabularyActions,
  VocabularySkeleton,
  VocabularyStateCard,
  VocabularyStudyCard,
} from '../../../features/vocabulary/components/VocabularyComponents';
import {
  useCompleteDailyVocabularyMutation,
  useDailyVocabularyWordsQuery,
  useMarkVocabularyWordMutation,
  useTodayVocabularyQuery,
} from '../../../features/vocabulary/hooks/useVocabularyQueries';
import type { VocabularyStatus } from '../../../features/vocabulary/types/vocabulary';
import {
  findFirstUnlearnedIndex,
  getVocabularyProgress,
  isLearnedStatus,
} from '../../../features/vocabulary/utils/vocabulary-utils';
import { colors, spacing } from '../../../theme';

export default function VocabularySessionScreen() {
  const router = useRouter();
  const todayQuery = useTodayVocabularyQuery();
  const dayId = todayQuery.data?.id;
  const wordsQuery = useDailyVocabularyWordsQuery(dayId);
  const markWord = useMarkVocabularyWordMutation(dayId);
  const completeDay = useCompleteDailyVocabularyMutation(dayId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const words = wordsQuery.data?.words ?? todayQuery.data?.words ?? [];
  const progress = useMemo(() => getVocabularyProgress(words, todayQuery.data), [todayQuery.data, words]);
  const currentItem = words[activeIndex] ?? null;

  useEffect(() => {
    if (wordsQuery.data?.words?.length) {
      setActiveIndex(findFirstUnlearnedIndex(wordsQuery.data.words));
    }
  }, [wordsQuery.data?.id, wordsQuery.data?.words]);

  const loading = (todayQuery.isLoading && !todayQuery.data) || (Boolean(dayId) && wordsQuery.isLoading && !wordsQuery.data);

  const handleAction = async (status: Extract<VocabularyStatus, 'LEARNING' | 'KNOWN' | 'REVIEW'>) => {
    if (!currentItem || !dayId || markWord.isPending || completeDay.isPending) return;
    setMutationError(null);

    try {
      await markWord.mutateAsync({ wordId: currentItem.wordId, status });
      const nextIndex = activeIndex + 1;
      const isLastWord = nextIndex >= words.length;

      if (!isLastWord) {
        setActiveIndex(nextIndex);
        return;
      }

      const result = await completeDay.mutateAsync();
      router.replace({
        pathname: '/learning/vocabulary/result',
        params: {
          learned: String(progress.learned + (isLearnedStatus(currentItem.progress?.status) ? 0 : 1)),
          total: String(result.words?.length ?? words.length),
        },
      });
    } catch {
      setMutationError('Chưa thể lưu tiến độ. Hãy thử lại trước khi chuyển sang từ tiếp theo.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <VocabularySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (todayQuery.error || wordsQuery.error || !dayId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <VocabularyStateCard
            title="Không thể mở phiên học"
            body="Chưa tải được bài từ vựng hôm nay từ backend."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/vocabulary')}>Về Từ vựng</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!words.length || !currentItem) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <VocabularyStateCard
            title="Không có từ trong phiên này"
            body="Backend trả về phiên rỗng. Hãy quay lại Từ vựng và thử tải lại."
            action={<AppButton onPress={() => router.replace('/learning/vocabulary')}>Về Từ vựng</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const actionPending = markWord.isPending || completeDay.isPending;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              {progress.learned}/{progress.total} đã lưu
            </AppText>
            <AppText variant="heading">Học từng từ</AppText>
          </View>
          <View style={styles.progressCircle}>
            <AppText variant="caption" color={colors.primary}>
              {progress.percent}%
            </AppText>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
        </View>

        <VocabularyStudyCard item={currentItem} index={activeIndex} total={words.length} />

        {currentItem.word.audio ? (
          <VocabularyStateCard
            title="Âm thanh có sẵn"
            body="Backend có audio URL cho từ này. Trình phát mobile sẽ được nối bằng Expo audio ở bước âm thanh riêng."
            icon="volume-high-outline"
          />
        ) : null}

        {mutationError ? (
          <VocabularyStateCard title="Chưa lưu được" body={mutationError} icon="alert-circle-outline" />
        ) : null}

        {actionPending ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Đang lưu tiến độ...</AppText>
          </View>
        ) : null}

        <VocabularyActions disabled={actionPending} onAction={(status) => void handleAction(status)} />

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} style={styles.footerText}>
            Tiến độ chỉ chuyển sang từ tiếp theo sau khi backend lưu thành công.
          </AppText>
        </View>
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
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  progressCircle: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    flex: 1,
  },
});
