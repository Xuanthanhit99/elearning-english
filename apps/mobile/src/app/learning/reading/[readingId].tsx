import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppText } from '../../../components/ui/AppText';
import { ReadingSkeleton, ReadingStateCard } from '../../../features/reading/components/ReadingComponents';
import {
  useReadingLessonQuery,
  useStartReadingArticleMutation,
} from '../../../features/reading/hooks/useReadingQueries';
import { splitReadingContent } from '../../../features/reading/utils/reading-utils';
import { colors, radius, spacing } from '../../../theme';

export default function ReadingArticleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ readingId?: string }>();
  const readingId = params.readingId;
  const lessonQuery = useReadingLessonQuery(readingId);
  const startArticle = useStartReadingArticleMutation();
  const [startError, setStartError] = useState<string | null>(null);

  const lesson = lessonQuery.data;
  const paragraphs = useMemo(() => splitReadingContent(lesson?.article.content), [lesson?.article.content]);

  async function continueToQuestions() {
    if (!lesson || startArticle.isPending) return;
    setStartError(null);

    if (lesson.session?.isCompleted) {
      router.replace({
        pathname: '/learning/reading/result',
        params: { sessionId: lesson.session.id },
      });
      return;
    }

    try {
      const session = lesson.session?.id
        ? { sessionId: lesson.session.id }
        : await startArticle.mutateAsync(lesson.article.id);

      router.push({
        pathname: '/learning/reading/questions',
        params: {
          readingId: lesson.article.slug,
          sessionId: session.sessionId,
        },
      });
    } catch {
      setStartError('Chua the bat dau phien Reading. Hay thu lai.');
    }
  }

  if (lessonQuery.isLoading && !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReadingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (lessonQuery.error || !lesson) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReadingStateCard
            title="Khong the tai bai doc"
            body="Bai doc nay chua san sang hoac khong tai duoc tu backend."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => router.replace('/learning/reading')}>Ve Reading</AppButton>}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.primary}>
              {lesson.article.categoryName} · {lesson.article.difficultyText}
            </AppText>
            <AppText variant="title">{lesson.article.title}</AppText>
            {lesson.article.description ? <AppText color={colors.textMuted}>{lesson.article.description}</AppText> : null}
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="reader-outline" size={24} color={colors.primary} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta text={lesson.article.readTimeText} />
          <Meta text={lesson.article.wordCountText} />
          <Meta text={`${lesson.article.xpReward} XP`} />
        </View>

        {lesson.tip ? (
          <ReadingStateCard title={lesson.tip.title} body={lesson.tip.content} icon="bulb-outline" />
        ) : null}

        <AppCard style={styles.passage}>
          {paragraphs.map((paragraph, index) => (
            <AppText key={`${index}-${paragraph.slice(0, 16)}`} color={colors.textMuted}>
              {paragraph}
            </AppText>
          ))}
        </AppCard>

        {lesson.vocabulary.length > 0 ? (
          <AppCard style={styles.vocabCard}>
            <AppText variant="heading">Tu vung goi y</AppText>
            {lesson.vocabulary.slice(0, 6).map((item) => (
              <View key={item.id} style={styles.vocabRow}>
                <AppText variant="small">{item.word}</AppText>
                <AppText color={colors.textMuted} style={styles.flex}>
                  {item.meaning}
                </AppText>
              </View>
            ))}
          </AppCard>
        ) : null}

        {startError ? <ReadingStateCard title="Chua mo duoc cau hoi" body={startError} icon="alert-circle-outline" /> : null}

        {startArticle.isPending ? (
          <View style={styles.saving}>
            <ActivityIndicator color={colors.primary} />
            <AppText color={colors.textMuted}>Dang mo phien Reading...</AppText>
          </View>
        ) : null}

        <AppButton disabled={startArticle.isPending || lesson.questions.length === 0} onPress={() => void continueToQuestions()}>
          {lesson.session?.isCompleted ? 'Xem ket qua' : lesson.session ? 'Tiep tuc cau hoi' : 'Bat dau cau hoi'}
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

function Meta({ text }: { text: string }) {
  return (
    <View style={styles.meta}>
      <AppText variant="caption" color={colors.primary}>
        {text}
      </AppText>
    </View>
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
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meta: {
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passage: {
    gap: spacing.lg,
  },
  vocabCard: {
    gap: spacing.md,
  },
  vocabRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saving: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
