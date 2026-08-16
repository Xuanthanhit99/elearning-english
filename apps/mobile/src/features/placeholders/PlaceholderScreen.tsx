import { AppCard } from '../../components/ui/AppCard';
import { AppText } from '../../components/ui/AppText';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen>
      <AppCard>
        <AppText variant="heading">{title}</AppText>
        <AppText color={colors.textMuted}>{description}</AppText>
      </AppCard>
    </Screen>
  );
}
