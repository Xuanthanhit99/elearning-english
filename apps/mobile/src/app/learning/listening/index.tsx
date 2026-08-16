import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  ListeningContinueCard,
  ListeningProgressCard,
  ListeningRecentCard,
  ListeningRecommendationCard,
  ListeningSkeleton,
  ListeningStateCard,
} from '../../../features/listening/components/ListeningComponents';
import { useListeningHomeQuery } from '../../../features/listening/hooks/useListeningQueries';
import { colors, spacing } from '../../../theme';

export default function ListeningOverviewScreen() {
  const router = useRouter();
  const homeQuery = useListeningHomeQuery();
  const data = homeQuery.data;

  function openDaily() {
    if (!data) return;
    router.push({
      pathname: '/learning/listening/[listeningId]',
      params: {
        listeningId: 'daily',
        level: data.dailyRecommendation.level,
        topic: data.dailyRecommendation.topic,
        limit: String(data.dailyRecommendation.limit),
      },
    });
  }

  function openContinue() {
    if (!data?.continueSession) return;
    router.push({
      pathname: '/learning/listening/[listeningId]',
      params: {
        listeningId: data.continueSession.sessionId,
        level: data.continueSession.level ?? data.dailyRecommendation.level,
        topic: data.continueSession.topic ?? data.dailyRecommendation.topic,
        limit: String(data.continueSession.total || data.dailyRecommendation.limit),
      },
    });
  }

  if (homeQuery.isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ListeningSkeleton />
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
              Listening
            </AppText>
            <AppText variant="title">Luyen nghe</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="headset-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {homeQuery.error && !data ? (
          <ListeningStateCard
            title="Khong the tai Listening"
            body="Chua tai duoc tien do Listening tu backend. Hay thu lai."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void homeQuery.refetch()}>Thu lai</AppButton>}
          />
        ) : null}

        {data ? (
          <>
            <ListeningProgressCard data={data} />

            {data.continueSession ? (
              <View style={styles.section}>
                <AppText variant="heading">Tiep tuc</AppText>
                <ListeningContinueCard session={data.continueSession} onPress={openContinue} />
              </View>
            ) : null}

            <View style={styles.section}>
              <AppText variant="heading">De xuat hom nay</AppText>
              <ListeningRecommendationCard recommendation={data.dailyRecommendation} onPress={openDaily} />
            </View>

            <View style={styles.section}>
              <AppText variant="heading">Gan day</AppText>
              {data.recentSessions.length > 0 ? (
                data.recentSessions.map((session) => (
                  <ListeningRecentCard
                    key={session.id}
                    session={session}
                    onPress={() =>
                      router.push({
                        pathname: '/learning/listening/result',
                        params: { sessionId: session.id },
                      })
                    }
                  />
                ))
              ) : (
                <ListeningStateCard
                  title="Chua co lich su"
                  body="Hoan thanh bai Listening dau tien de xem ket qua tai day."
                  icon="time-outline"
                />
              )}
            </View>
          </>
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
  section: {
    gap: spacing.md,
  },
});
