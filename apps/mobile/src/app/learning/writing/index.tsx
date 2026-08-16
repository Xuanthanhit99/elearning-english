import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppText } from '../../../components/ui/AppText';
import {
  WritingProgressCard,
  WritingRecentCard,
  WritingSkeleton,
  WritingStateCard,
  WritingTaskCard,
} from '../../../features/writing/components/WritingComponents';
import { useWritingHomeQuery } from '../../../features/writing/hooks/useWritingQueries';
import { colors, spacing } from '../../../theme';

export default function WritingOverviewScreen() {
  const router = useRouter();
  const homeQuery = useWritingHomeQuery();
  const data = homeQuery.data;

  if (homeQuery.isLoading && !data) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WritingSkeleton />
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
              Writing
            </AppText>
            <AppText variant="title">Luyen viet</AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </View>
        </View>

        {homeQuery.error && !data ? (
          <WritingStateCard
            title="Khong the tai Writing"
            body="Chua tai duoc bai viet va tien do tu backend. Hay thu lai."
            icon="alert-circle-outline"
            action={<AppButton onPress={() => void homeQuery.refetch()}>Thu lai</AppButton>}
          />
        ) : null}

        {data ? (
          <>
            <WritingProgressCard data={data} />

            {data.dailyGoal.continueSessionId ? (
              <WritingStateCard
                title="Tiep tuc ban nhap"
                body={data.dailyGoal.title}
                icon="document-text-outline"
                action={
                  <AppButton
                    onPress={() =>
                      router.push({
                        pathname: '/learning/writing/editor',
                        params: { sessionId: data.dailyGoal.continueSessionId },
                      })
                    }
                  >
                    Tiep tuc
                  </AppButton>
                }
              />
            ) : null}

            <View style={styles.section}>
              <AppText variant="heading">De xuat</AppText>
              {data.recommendations.length > 0 ? (
                data.recommendations.map((item) => (
                  <WritingTaskCard
                    key={item.id}
                    task={item}
                    onPress={() =>
                      router.push({
                        pathname: '/learning/writing/[taskId]',
                        params: { taskId: item.id },
                      })
                    }
                  />
                ))
              ) : (
                <WritingStateCard title="Chua co bai de xuat" body="Backend chua tra ve bai Writing phu hop." />
              )}
            </View>

            <View style={styles.section}>
              <AppText variant="heading">Gan day</AppText>
              {data.recentHistory.length > 0 ? (
                data.recentHistory.map((item) => (
                  <WritingRecentCard
                    key={item.id}
                    session={item}
                    onPress={() =>
                      router.push({
                        pathname: '/learning/writing/result',
                        params: { sessionId: item.id },
                      })
                    }
                  />
                ))
              ) : (
                <WritingStateCard
                  title="Chua co lich su"
                  body="Hoan thanh bai Writing dau tien de xem ket qua tai day."
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
