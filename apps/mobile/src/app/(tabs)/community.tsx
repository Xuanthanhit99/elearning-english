import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import {
  CommunityFeedTabs,
  CommunityPostCard,
  CommunitySkeleton,
  CommunityStateCard,
} from '../../features/community/components/CommunityComponents';
import {
  useBookmarkCommunityPostMutation,
  useCommunityFeedQuery,
  useReactCommunityPostMutation,
} from '../../features/community/hooks/useCommunityQueries';
import type { CommunityFeedTab, CommunityPost } from '../../features/community/types/community';
import { communityBookmarked, communityViewerReaction } from '../../features/community/utils/community-utils';
import { colors, spacing } from '../../theme';

export default function CommunityScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<CommunityFeedTab>('POPULAR');
  const feedQuery = useCommunityFeedQuery(tab);
  const posts = useMemo(() => feedQuery.data?.pages.flatMap((page) => page.items) ?? [], [feedQuery.data]);
  const refreshing = feedQuery.isRefetching && !feedQuery.isFetchingNextPage;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <FlatList
        ListEmptyComponent={
          feedQuery.isLoading ? (
            <CommunitySkeleton />
          ) : feedQuery.error ? (
            <CommunityStateCard
              title="Khong the tai Cong dong"
              body={feedQuery.error.message}
              icon="alert-circle-outline"
              action={<AppButton onPress={() => void feedQuery.refetch()}>Thu lai</AppButton>}
            />
          ) : (
            <CommunityStateCard
              title={tab === 'FOLLOWING' ? 'Ban chua theo doi noi dung nao' : 'Chua co bai viet'}
              body={tab === 'FOLLOWING' ? 'Kham pha them trong Cong dong.' : 'Backend chua tra ve bai viet phu hop.'}
              icon="chatbubbles-outline"
            />
          )
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <View>
                <AppText variant="caption" color={colors.primary}>
                  BeaconVie
                </AppText>
                <AppText variant="title">Cong dong</AppText>
              </View>
              <View style={styles.headerActions}>
                <AppButton onPress={() => router.push('/community/create')}>Dang bai</AppButton>
                <View style={styles.headerIcon}>
                  <Ionicons name="people-outline" size={24} color={colors.primary} />
                </View>
              </View>
            </View>
            <CommunityFeedTabs active={tab} onChange={setTab} />
          </View>
        }
        contentContainerStyle={styles.content}
        data={posts}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void feedQuery.refetch()} tintColor={colors.primary} />}
        renderItem={({ item }) => <FeedPost post={item} onOpen={() => router.push({ pathname: '/community/[postId]', params: { postId: item.id } })} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function FeedPost({ onOpen, post }: { onOpen: () => void; post: CommunityPost }) {
  const reactMutation = useReactCommunityPostMutation(post.id);
  const bookmarkMutation = useBookmarkCommunityPostMutation(post.id);

  return (
    <CommunityPostCard
      onBookmark={() => bookmarkMutation.mutate(communityBookmarked(post))}
      onOpen={onOpen}
      onReact={() => reactMutation.mutate(Boolean(communityViewerReaction(post)))}
      pendingBookmark={bookmarkMutation.isPending}
      pendingReaction={reactMutation.isPending}
      post={post}
    />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  headerBlock: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  footer: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
