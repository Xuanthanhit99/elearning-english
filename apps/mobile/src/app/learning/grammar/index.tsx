import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import { getGrammarTopicLessons } from '../../../features/grammar/api/grammar-api';
import {
  GrammarProgressCard,
  GrammarSkeleton,
  GrammarStateCard,
  GrammarTopicCard,
} from '../../../features/grammar/components/GrammarComponents';
import { useGrammarDashboardQuery } from '../../../features/grammar/hooks/useGrammarQueries';
import { grammarKeys } from '../../../features/grammar/query-keys';
import type { GrammarTopic } from '../../../features/grammar/types/grammar';
import { findContinueTopic } from '../../../features/grammar/utils/grammar-utils';
import { colors, spacing } from '../../../theme';

export default function GrammarOverviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, error, isLoading, refetch } = useGrammarDashboardQuery();
  const [openingTopicId, setOpeningTopicId] = useState<string | null>(null);
  const continueTopic = useMemo(() => findContinueTopic(data), [data]);

  async function openTopic(topic: GrammarTopic) {
    if (openingTopicId) return;
    setOpeningTopicId(topic.id);

    try {
      const lessons = await queryClient.fetchQuery({
        queryKey: grammarKeys.topicLessons(topic.id),
        queryFn: () => getGrammarTopicLessons(topic.id),
      });
      const target = lessons.find((lesson) => !lesson.completed) ?? lessons[0];

      if (target?.id) {
        router.push({
          pathname: '/learning/grammar/[lessonId]',
          params: { lessonId: target.id },
        });
      }
    } finally {
      setOpeningTopicId(null);
    }
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <GrammarSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <GrammarStateCard
            title="Không thể tải Ngữ pháp"
            body="Không thể tải nội dung Ngữ pháp. Hãy thử lại."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void refetch()}>Thử lại</AppButton>}
          />
        </View>
      </SafeAreaView>
    );
  }

  const progress = data?.roadmap.progress ?? 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={data?.topics ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.header}>
              <View>
                <AppText variant="caption" color={colors.primary}>
                  Ngữ pháp
                </AppText>
                <AppText variant="title">Grammar Hub</AppText>
              </View>
              <View style={styles.headerIcon}>
                <Ionicons name="school-outline" size={24} color={colors.primary} />
              </View>
            </View>
            {data ? (
              <GrammarProgressCard
                averageScore={data.stats.averageScore}
                completedLessons={data.stats.completedLessons}
                totalLessons={data.stats.totalLessons}
                progress={progress}
              />
            ) : null}
            {continueTopic ? (
              <GrammarStateCard
                title="Tiếp tục Ngữ pháp"
                body={`${continueTopic.title} · ${continueTopic.completedLessons}/${continueTopic.totalLessons} bài học`}
                icon="play-circle-outline"
                action={
                  <AppButton disabled={openingTopicId === continueTopic.id} onPress={() => void openTopic(continueTopic)}>
                    Tiếp tục
                  </AppButton>
                }
              />
            ) : null}
            <AppText variant="heading">Chủ điểm</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.topicWrap}>
            <GrammarTopicCard topic={item} onPress={() => void openTopic(item)} />
          </View>
        )}
        ListEmptyComponent={
          <GrammarStateCard
            title="Chưa có chủ điểm"
            body="Backend chưa trả về chủ điểm Ngữ pháp cho trình độ hiện tại."
          />
        }
        ListFooterComponent={
          openingTopicId ? (
            <View style={styles.opening}>
              <ActivityIndicator color={colors.primary} />
              <AppText color={colors.textMuted}>Đang mở bài học...</AppText>
            </View>
          ) : null
        }
      />
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
  headerStack: {
    gap: spacing.lg,
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
  topicWrap: {
    marginBottom: spacing.md,
  },
  opening: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
