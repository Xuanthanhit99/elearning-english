import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ReadingArticleCard,
  ReadingProgressCard,
  ReadingSkeleton,
  ReadingStateCard,
} from '../../../features/reading/components/ReadingComponents';
import { useReadingArticlesQuery } from '../../../features/reading/hooks/useReadingQueries';
import { readingKeys } from '../../../features/reading/query-keys';
import type { ReadingArticleListItem } from '../../../features/reading/types/reading';
import { colors, spacing } from '../../../theme';

const ARTICLE_PARAMS = { page: 1, limit: 20, sort: 'newest' as const };

export default function ReadingOverviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const articlesQuery = useReadingArticlesQuery(ARTICLE_PARAMS);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: readingKeys.all });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  function openArticle(article: ReadingArticleListItem) {
    router.push({
      pathname: '/learning/reading/[readingId]',
      params: { readingId: article.slug },
    });
  }

  if (articlesQuery.isLoading && !articlesQuery.data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <ReadingSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  const data = articlesQuery.data;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        data={data?.articles ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.header}>
              <View>
                <AppText variant="caption" color={colors.primary}>
                  Reading
                </AppText>
                <AppText variant="title">Luyen doc</AppText>
              </View>
              <View style={styles.headerIcon}>
                <Ionicons name="book-outline" size={24} color={colors.primary} />
              </View>
            </View>

            {articlesQuery.error && !data ? (
              <ReadingStateCard
                title="Khong the tai Reading"
                body="Chua tai duoc danh sach bai doc tu backend. Hay thu lai."
                icon="alert-circle-outline"
                action={<AppButton onPress={() => void refresh()}>Thu lai</AppButton>}
              />
            ) : null}

            {data ? (
              <ReadingProgressCard
                completed={data.summary.completedArticles}
                learning={data.summary.learningArticles}
                percent={data.summary.progressPercent}
                total={data.summary.totalArticles}
              />
            ) : null}

            <AppText variant="heading">Bai doc</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.articleWrap}>
            <ReadingArticleCard article={item} onPress={() => openArticle(item)} />
          </View>
        )}
        ListEmptyComponent={
          articlesQuery.error ? null : (
            <ReadingStateCard
              title="Chua co bai doc"
              body="Backend chua tra ve bai Reading nao cho tai khoan nay."
              action={<AppButton onPress={() => void refresh()}>Tai lai</AppButton>}
            />
          )
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
  articleWrap: {
    marginBottom: spacing.md,
  },
});
