import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors, spacing } from '../../theme';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  learn: { active: 'book', inactive: 'book-outline' },
  practice: { active: 'sparkles', inactive: 'sparkles-outline' },
  community: { active: 'people', inactive: 'people-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

function tabBarIcon(routeName: string) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => {
    const icon = tabIcons[routeName] ?? tabIcons.index;
    return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={String(color)} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarIcon: tabBarIcon(route.name),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarStyle: {
          minHeight: 68,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="learn" options={{ title: 'Học tập' }} />
      <Tabs.Screen name="practice" options={{ title: 'Luyện tập' }} />
      <Tabs.Screen name="community" options={{ title: 'Cộng đồng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Hồ sơ' }} />
    </Tabs>
  );
}
