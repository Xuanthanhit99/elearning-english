import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  WritingEditor,
  WritingPromptCard,
  WritingSkeleton,
  WritingStateCard,
} from '../../../features/writing/components/WritingComponents';
import { useWritingDraft } from '../../../features/writing/hooks/useWritingDraft';
import {
  useSaveWritingDraftMutation,
  useSubmitWritingMutation,
  useWritingSessionQuery,
} from '../../../features/writing/hooks/useWritingQueries';
import { countWritingWords, formatWritingTime } from '../../../features/writing/utils/writing-utils';
import { colors, spacing } from '../../../theme';

export default function WritingEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;
  const sessionQuery = useWritingSessionQuery(sessionId);
  const saveDraft = useSaveWritingDraftMutation(sessionId);
  const submitWriting = useSubmitWritingMutation(sessionId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [serverSavedAt, setServerSavedAt] = useState<string | null>(null);
  const submitLocked = useRef(false);

  const data = sessionQuery.data;
  const draft = useWritingDraft(sessionId, data?.session.content ?? '');

  useEffect(() => {
    if (data?.session.timeSpentSeconds) {
      setTimeSpent(data.session.timeSpentSeconds);
    }
  }, [data?.session.timeSpentSeconds]);

  useEffect(() => {
    if (!data?.session.isSubmitted || !sessionId) return;

    router.replace({
      pathname: '/learning/writing/result',
      params: { sessionId },
    });
  }, [data?.session.isSubmitted, router, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionId || !draft.loaded || !data || data.session.isSubmitted) return;

    const timeout = setTimeout(() => {
      saveDraft
        .mutateAsync({
          content: draft.content,
          timeSpentSeconds: timeSpent,
        })
        .then(() => setServerSavedAt(new Date().toLocaleTimeString()))
        .catch(() => undefined);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [data, draft.content, draft.loaded, saveDraft, sessionId, timeSpent]);

  async function submit() {
    if (!data || !sessionId || submitWriting.isPending || submitLocked.current) return;
    setSubmitError(null);

    const words = countWritingWords(draft.content);
    if (!draft.content.trim()) {
      setSubmitError('Ban can nhap bai viet truoc khi nop.');
      return;
    }

    if (words < data.lesson.minWords) {
      setSubmitError(`Bai viet can toi thieu ${data.lesson.minWords} tu.`);
      return;
    }

    submitLocked.current = true;
    try {
      const result = await submitWriting.mutateAsync({
        content: draft.content,
        timeSpentSeconds: timeSpent,
      });
      await draft.clearDraft();

      router.replace({
        pathname: '/learning/writing/processing',
        params: { sessionId: result.sessionId },
      });
    } catch {
      setSubmitError('Chua the gui bai. Noi dung cua ban van duoc giu lai.');
      submitLocked.current = false;
    }
  }

  if (sessionQuery.isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sessionQuery.error || !data || !sessionId) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingStateCard
            title="Khong the tai bai viet"
            body="Phien Writing khong san sang hoac khong thuoc tai khoan nay."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/writing')}>Ve Writing</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <WritingPromptCard data={data} />

          <WritingEditor
            content={draft.content}
            editable={!submitWriting.isPending}
            maxWords={data.lesson.maxWords}
            minWords={data.lesson.minWords}
            onChangeText={(text) => {
              draft.setContent(text);
              setSubmitError(null);
            }}
          />

          <WritingStateCard
            title="Luu ban nhap"
            body={`Server draft: ${serverSavedAt ? `saved ${serverSavedAt}` : saveDraft.isPending ? 'saving...' : 'waiting'} | Local safety: ${
              draft.saveError ? 'needs retry' : 'on'
            } | Time ${formatWritingTime(timeSpent)}`}
            icon="cloud-done-outline"
          />

          {draft.saveError ? <WritingStateCard title="Chua luu local" body={draft.saveError} icon="alert-circle-outline" /> : null}
          {saveDraft.error ? (
            <WritingStateCard
              title="Chua luu server"
              body="Ban nhap van duoc giu tren thiet bi va se thu lai khi ban tiep tuc viet."
              icon="cloud-offline-outline"
            />
          ) : null}
          {submitError ? <WritingStateCard title="Chua nop duoc" body={submitError} icon="alert-circle-outline" /> : null}

          {submitWriting.isPending ? (
            <View style={styles.saving}>
              <ActivityIndicator color={colors.primary} />
              <AppText color={colors.textMuted}>Dang gui bai viet...</AppText>
            </View>
          ) : null}

          <AppButton disabled={submitWriting.isPending || !draft.loaded} onPress={() => void submit()}>
            Gui bai
          </AppButton>
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
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
