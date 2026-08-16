import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing, typography } from '../../../theme';
import type { CommunityComment, CommunityFeedTab, CommunityPost } from '../types/community';
import {
  communityAuthorName,
  communityBookmarked,
  communityTypeLabel,
  communityViewerReaction,
  formatCommunityTime,
  resolveCommunityMediaUrl,
} from '../utils/community-utils';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function CommunitySkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeleton, { minHeight: 120 }]} />
      <View style={[styles.skeleton, { minHeight: 220 }]} />
      <View style={[styles.skeleton, { minHeight: 220 }]} />
    </View>
  );
}

export function CommunityStateCard({
  action,
  body,
  icon = 'people-outline',
  title,
}: {
  action?: ReactNode;
  body: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <AppCard style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.stateBody}>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{body}</AppText>
        {action}
      </View>
    </AppCard>
  );
}

export function CommunityFeedTabs({
  active,
  onChange,
}: {
  active: CommunityFeedTab;
  onChange: (tab: CommunityFeedTab) => void;
}) {
  const tabs: Array<{ key: CommunityFeedTab; label: string }> = [
    { key: 'FOR_YOU', label: 'For you' },
    { key: 'POPULAR', label: 'Pho bien' },
    { key: 'LATEST', label: 'Moi nhat' },
    { key: 'FOLLOWING', label: 'Dang theo doi' },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, selected ? styles.tabActive : null]}
          >
            <AppText variant="caption" color={selected ? colors.white : colors.primary}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CommunityPostCard({
  collapsed = true,
  onBookmark,
  onOpen,
  onReact,
  pendingBookmark,
  pendingReaction,
  post,
}: {
  collapsed?: boolean;
  onBookmark?: () => void;
  onOpen?: () => void;
  onReact?: () => void;
  pendingBookmark?: boolean;
  pendingReaction?: boolean;
  post: CommunityPost;
}) {
  const reaction = communityViewerReaction(post);
  const bookmarked = communityBookmarked(post);
  const firstImage = post.media?.find((item) => item.type === 'IMAGE');
  const imageUrl = resolveCommunityMediaUrl(firstImage?.url);

  return (
    <Pressable accessibilityRole={onOpen ? 'button' : undefined} onPress={onOpen}>
      {({ pressed }) => (
        <AppCard style={[styles.postCard, pressed ? styles.pressed : null]}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              {post.author.avatar ? (
                <Image source={{ uri: resolveCommunityMediaUrl(post.author.avatar) ?? post.author.avatar }} style={styles.avatarImage} />
              ) : (
                <AppText variant="small" color={colors.white}>
                  {communityAuthorName(post.author).slice(0, 1).toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="small">{communityAuthorName(post.author)}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                Level {post.author.level ?? '-'} | {formatCommunityTime(post.createdAt)}
              </AppText>
            </View>
            <View style={styles.typePill}>
              <AppText variant="caption" color={colors.primary}>
                {communityTypeLabel(post.type)}
              </AppText>
            </View>
          </View>

          {post.title ? <AppText variant="heading">{post.title}</AppText> : null}
          <AppText color={colors.textSecondary} numberOfLines={collapsed ? 5 : undefined}>
            {post.content}
          </AppText>
          {collapsed && post.content.length > 260 ? (
            <AppText variant="caption" color={colors.primary}>
              Xem them
            </AppText>
          ) : null}

          {imageUrl ? (
            <Image accessibilityLabel={post.title ?? 'Community image'} source={{ uri: imageUrl }} style={styles.postImage} />
          ) : null}

          {post.media?.some((item) => item.type !== 'IMAGE') ? (
            <View style={styles.mediaNotice}>
              <Ionicons name="attach-outline" size={18} color={colors.primary} />
              <AppText variant="caption" color={colors.textMuted}>
                Bai viet co media khac. Mobile hien thi anh trong phase nay.
              </AppText>
            </View>
          ) : null}

          {post.tags?.length ? (
            <View style={styles.tagRow}>
              {post.tags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <AppText variant="caption" color={colors.primary}>
                    #{tag}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              active={Boolean(reaction)}
              disabled={pendingReaction}
              icon={reaction ? 'heart' : 'heart-outline'}
              label={`${post.reactionsCount}`}
              onPress={onReact}
            />
            <ActionButton icon="chatbubble-outline" label={`${post.commentsCount}`} onPress={onOpen} />
            <ActionButton
              active={bookmarked}
              disabled={pendingBookmark}
              icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
              label={`${post.bookmarksCount}`}
              onPress={onBookmark}
            />
          </View>
        </AppCard>
      )}
    </Pressable>
  );
}

export function CommentCard({ comment, onReply }: { comment: CommunityComment; onReply?: (comment: CommunityComment) => void }) {
  return (
    <View style={styles.commentWrap}>
      <View style={styles.commentBubble}>
        <AppText variant="small">{communityAuthorName(comment.author)}</AppText>
        <AppText color={colors.textSecondary}>{comment.content}</AppText>
        <View style={styles.commentFooter}>
          <AppText variant="caption" color={colors.textMuted}>
            {formatCommunityTime(comment.createdAt)}
          </AppText>
          {onReply ? (
            <Pressable accessibilityRole="button" onPress={() => onReply(comment)} style={styles.replyButton}>
              <AppText variant="caption" color={colors.primary}>
                Tra loi
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      {comment.replies?.length ? (
        <View style={styles.replyList}>
          {comment.replies.map((reply) => (
            <CommentCard key={reply.id} comment={reply} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function CommentComposer({
  disabled,
  error,
  onCancelReply,
  onChangeText,
  onSubmit,
  replyName,
  value,
}: {
  disabled: boolean;
  error?: string | null;
  onCancelReply?: () => void;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  replyName?: string | null;
  value: string;
}) {
  return (
    <AppCard style={styles.composer}>
      {replyName ? (
        <View style={styles.replyingTo}>
          <AppText variant="caption" color={colors.textMuted}>
            Dang tra loi {replyName}
          </AppText>
          <Pressable accessibilityRole="button" onPress={onCancelReply}>
            <AppText variant="caption" color={colors.primary}>
              Huy
            </AppText>
          </Pressable>
        </View>
      ) : null}
      <TextInput
        accessibilityLabel="Noi dung binh luan"
        editable={!disabled}
        multiline
        onChangeText={onChangeText}
        placeholder="Viet binh luan..."
        placeholderTextColor={colors.textMuted}
        style={styles.commentInput}
        textAlignVertical="top"
        value={value}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      <AppButton disabled={disabled || !value.trim()} onPress={onSubmit}>
        Gui binh luan
      </AppButton>
    </AppCard>
  );
}

export function CreatePostForm({
  content,
  disabled,
  error,
  onChangeContent,
  onSubmit,
  title,
  onChangeTitle,
}: {
  content: string;
  disabled: boolean;
  error?: string | null;
  onChangeContent: (text: string) => void;
  onChangeTitle: (text: string) => void;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <AppCard style={styles.composer}>
      <TextInput
        accessibilityLabel="Tieu de bai viet"
        editable={!disabled}
        onChangeText={onChangeTitle}
        placeholder="Tieu de tuy chon"
        placeholderTextColor={colors.textMuted}
        style={styles.titleInput}
        value={title}
      />
      <TextInput
        accessibilityLabel="Noi dung bai viet"
        editable={!disabled}
        multiline
        onChangeText={onChangeContent}
        placeholder="Ban muon chia se dieu gi?"
        placeholderTextColor={colors.textMuted}
        style={styles.postInput}
        textAlignVertical="top"
        value={content}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      <AppButton disabled={disabled || !content.trim()} onPress={onSubmit}>
        Dang bai
      </AppButton>
    </AppCard>
  );
}

function ActionButton({
  active,
  disabled,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, active ? styles.actionActive : null, pressed ? styles.pressed : null]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textMuted} />
      <AppText variant="caption" color={active ? colors.primary : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  skeleton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
  },
  stateCard: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stateIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  stateBody: {
    flex: 1,
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  tab: {
    minHeight: 44,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  postCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 23,
    backgroundColor: colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  typePill: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  postImage: {
    width: '100%',
    minHeight: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
  },
  mediaNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionButton: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
  },
  actionActive: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.78,
  },
  commentWrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentBubble: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  replyButton: {
    minHeight: 32,
    justifyContent: 'center',
  },
  replyList: {
    gap: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: spacing.lg,
    paddingLeft: spacing.md,
  },
  composer: {
    gap: spacing.md,
  },
  replyingTo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  commentInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    padding: spacing.md,
  },
  titleInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    paddingHorizontal: spacing.md,
  },
  postInput: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontFamily: typography.family.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    padding: spacing.md,
  },
});
