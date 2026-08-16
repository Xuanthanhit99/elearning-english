import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import { CreatePostForm, CommunityStateCard } from '../../features/community/components/CommunityComponents';
import { useCreateCommunityPostMutation } from '../../features/community/hooks/useCommunityQueries';
import { colors, spacing } from '../../theme';

export default function CreateCommunityPostScreen() {
  const router = useRouter();
  const createPost = useCreateCommunityPostMutation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function submit() {
    const post = await createPost.mutateAsync({
      type: 'SHARE',
      title: title.trim() || undefined,
      content: content.trim(),
      visibility: 'PUBLIC',
    });
    router.replace({ pathname: '/community/[postId]', params: { postId: post.id } });
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <AppText variant="caption" color={colors.primary}>
                Cong dong
              </AppText>
              <AppText variant="title">Dang bai viet</AppText>
            </View>
            <AppButton onPress={() => router.back()}>Huy</AppButton>
          </View>

          <CreatePostForm
            content={content}
            disabled={createPost.isPending}
            error={createPost.error?.message}
            onChangeContent={setContent}
            onChangeTitle={setTitle}
            onSubmit={() => void submit()}
            title={title}
          />

          <CommunityStateCard
            title="Noi dung that"
            body="Phase nay dung endpoint tao post that cua backend. Media upload va club selection duoc de lai khi mobile co flow upload rieng."
            icon="information-circle-outline"
          />
        </ScrollView>
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
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
