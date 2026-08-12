import Button from '@/components/ui/Button';
import Screen from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/theme';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';


export default function HomeScreen() {
  return (
    <Screen scroll style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            BeaconVie
          </Text>

          <Text style={styles.greeting}>
            Chào buổi sáng 👋
          </Text>
        </View>

        <View style={styles.streak}>
          <Text style={styles.streakEmoji}>
            🔥
          </Text>

          <Text style={styles.streakText}>
            12
          </Text>
        </View>
      </View>

      <Text style={styles.title}>
        Sẵn sàng học tiếng Anh hôm nay?
      </Text>

      <View style={styles.continueCard}>
        <Text style={styles.cardLabel}>
          TIẾP TỤC HÀNH TRÌNH
        </Text>

        <Text style={styles.lessonTitle}>
          Everyday Conversations
        </Text>

        <Text style={styles.level}>
          Intermediate · A2
        </Text>

        <View style={styles.progressBackground}>
          <View style={styles.progress} />
        </View>

        <Text style={styles.progressText}>
          72% hoàn thành
        </Text>

        <Button
          title="Học tiếp"
          onPress={() => {
            console.log('Continue learning');
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Mục tiêu hôm nay
        </Text>

        <Text style={styles.percent}>
          60%
        </Text>
      </View>

      <View style={styles.stats}>
        <StatCard
          value="10"
          label="Từ mới"
        />

        <StatCard
          value="2"
          label="Bài học"
        />

        <StatCard
          value="120"
          label="XP"
        />
      </View>

      <Text style={styles.sectionTitle}>
        Dành cho bạn
      </Text>

      <View style={styles.recommendCard}>
        <Text style={styles.recommendEmoji}>
          🎧
        </Text>

        <View style={styles.recommendContent}>
          <Text style={styles.recommendType}>
            Listening
          </Text>

          <Text style={styles.recommendTitle}>
            Ordering coffee naturally
          </Text>

          <Text style={styles.recommendMeta}>
            5 phút · A2
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },

  greeting: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 14,
  },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,

    backgroundColor: colors.surface,

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: radius.full,
  },

  streakEmoji: {
    fontSize: 17,
  },

  streakText: {
    color: colors.text,
    fontWeight: '800',
  },

  title: {
    maxWidth: 320,

    color: colors.text,

    fontSize: 28,
    lineHeight: 36,

    fontWeight: '800',
  },

  continueCard: {
    gap: 10,

    padding: spacing.xl,

    backgroundColor: colors.surface,

    borderRadius: radius.xxl,
  },

  cardLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  lessonTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  level: {
    color: colors.textSecondary,
  },

  progressBackground: {
    height: 8,

    backgroundColor: colors.surfaceSecondary,

    borderRadius: radius.full,

    overflow: 'hidden',
  },

  progress: {
    width: '72%',
    height: '100%',

    backgroundColor: colors.primary,
  },

  progressText: {
    marginBottom: 5,

    color: colors.textSecondary,
    fontSize: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  percent: {
    color: colors.primary,
    fontWeight: '800',
  },

  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  statCard: {
    flex: 1,

    alignItems: 'center',

    paddingVertical: 18,

    backgroundColor: colors.surface,

    borderRadius: radius.lg,
  },

  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  statLabel: {
    marginTop: 4,

    color: colors.textSecondary,
    fontSize: 12,
  },

  recommendCard: {
    flexDirection: 'row',

    gap: spacing.md,

    padding: spacing.lg,

    backgroundColor: colors.surface,

    borderRadius: radius.xl,
  },

  recommendEmoji: {
    fontSize: 28,
  },

  recommendContent: {
    flex: 1,
  },

  recommendType: {
    color: colors.primary,
    fontWeight: '700',
  },

  recommendTitle: {
    marginTop: 3,

    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  recommendMeta: {
    marginTop: 4,

    color: colors.textSecondary,
    fontSize: 12,
  },
});