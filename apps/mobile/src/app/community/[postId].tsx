import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import {
  CommentCard,
  CommentComposer,
  CommunityPostCard,
  CommunitySkeleton,
  CommunityStateCard,
} from '../../features/community/components/CommunityComponents';
import {
  useBookmarkCommunityPostMutation,
  useCommunityCommentsQuery,
  useCommunityPostQuery,
  useCreateCommunityCommentMutation,
  useReactCommunityPostMutation,
} from '../../features/community/hooks/useCommunityQueries';
import type { CommunityComment } from '../../features/community/types/community';
import { communityAuthorName, communityBookmarked, communityViewerReaction } from '../../features/community/utils/community-utils';
import { colors, spacing } from '../../theme';

export default function CommunityPostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = params.postId;
  const postQuery = useCommunityPostQuery(postId);
  const commentsQuery = useCommunityCommentsQuery(postId);
  const createComment = useCreateCommunityCommentMutation(postId);
  const reactMutation = useReactCommunityPostMutation(postId ?? '');
  const bookmarkMutation = useBookmarkCommunityPostMutation(postId ?? '');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const post = postQuery.data;
  const comments = commentsQuery.data ?? [];
  const errorMessage = useMemo(() => createComment.error?.message ?? null, [createComment.error]);

  async function submitComment() {
    const value = draft.trim();
    if (!value) return;
    await createComment.mutateAsync({ content: value, parentId: replyTo?.id });
    setDraft('');
    setReplyTo(null);
  }

  if (postQuery.isLoading && !post) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <CommunitySkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (postQuery.error || !post || !postId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.content}>
          <CommunityStateCard
            title="Khong the tai bai viet"
            body="Bai viet nay khong con kha dung hoac ban khong co quyen xem."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/(tabs)/community')}>Ve Cong dong</AppButton>}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <FlatList
          ListFooterComponent={
            <View style={styles.footer}>
              {commentsQuery.error ? (
                <CommunityStateCard
                  title="Khong the tai binh luan"
                  body={commentsQuery.error.message}
                  icon="alert-circle-outline"
                  action={<AppButton onPress={() => void commentsQuery.refetch()}>Thu lai</AppButton>}
                />
              ) : null}
              <CommentComposer
                disabled={createComment.isPending}
                error={errorMessage}
                onCancelReply={() => setReplyTo(null)}
                onChangeText={setDraft}
                onSubmit={() => void submitComment()}
                replyName={replyTo ? communityAuthorName(replyTo.author) : null}
                value={draft}
              />
            </View>
          }
          ListHeaderComponent={
            <View style={styles.detailHeader}>
              <CommunityPostCard
                collapsed={false}
                onBookmark={() => bookmarkMutation.mutate(communityBookmarked(post))}
                onReact={() => reactMutation.mutate(Boolean(communityViewerReaction(post)))}
                pendingBookmark={bookmarkMutation.isPending}
                pendingReaction={reactMutation.isPending}
                post={post}
              />
            </View>
          }
          contentContainerStyle={styles.content}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentCard comment={item} onReply={setReplyTo} />}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  detailHeader: {
    marginBottom: spacing.md,
  },
  footer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
});
