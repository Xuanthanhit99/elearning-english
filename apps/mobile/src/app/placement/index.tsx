import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../components/ui/AppButton';
import { AppText } from '../../components/ui/AppText';
import {
  PlacementIntroCard,
  PlacementSkeleton,
  PlacementStateCard,
} from '../../features/placement/components/PlacementComponents';
import {
  usePlacementIntroductionQuery,
  usePlacementRetakeStatusQuery,
  useStartPlacementMutation,
} from '../../features/placement/hooks/usePlacementQueries';
import { colors, spacing } from '../../theme';

export default function PlacementIndexScreen() {
  const router = useRouter();
  const introQuery = usePlacementIntroductionQuery();
  const retakeQuery = usePlacementRetakeStatusQuery();
  const startMutation = useStartPlacementMutation();
  const intro = introQuery.data;
  const retake = retakeQuery.data;
  const activeSessionId = intro?.test.sessionId ?? retake?.currentTestId ?? null;

  async function start() {
    if (activeSessionId && intro?.test.hasActiveSession) {
      router.push({ pathname: '/placement/test', params: { sessionId: activeSessionId } });
      return;
    }

    const result = await startMutation.mutateAsync();
    router.push({ pathname: '/placement/test', params: { sessionId: result.sessionId } });
  }

  if ((introQuery.isLoading || retakeQuery.isLoading) && !intro) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PlacementSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={colors.primary}>
              BeaconVie
            </AppText>
            <AppText variant="title">Placement Test</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="school-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {introQuery.error && !intro ? (
          <PlacementStateCard
            title="Khong the tai bai kiem tra"
            body="Chua tai duoc thong tin Placement tu backend."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void introQuery.refetch()}>Thu lai</AppButton>}
          />
        ) : null}

        {intro ? <PlacementIntroCard data={intro} /> : null}

        {retake?.state === 'PROCESSING' && retake.currentTestId ? (
          <PlacementStateCard
            title="Ket qua dang duoc xu ly"
            body={retake.message}
            icon="analytics-outline"
            action={
              <AppButton onPress={() => router.push({ pathname: '/placement/processing', params: { testId: retake.currentTestId } })}>
                Xem trang thai
              </AppButton>
            }
          />
        ) : null}

        {retake?.state === 'COOLDOWN' ? (
          <PlacementStateCard title="Chua the lam lai" body={retake.message} icon="time-outline" />
        ) : null}

        <AppButton disabled={startMutation.isPending || retake?.state === 'COOLDOWN'} onPress={() => void start()}>
          {intro?.test.hasActiveSession ? 'Tiep tuc bai kiem tra' : 'Bat dau'}
        </AppButton>

        {startMutation.error ? (
          <PlacementStateCard title="Chua bat dau duoc" body={startMutation.error.message} icon="alert-circle-outline" />
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
