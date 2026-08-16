import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../providers/AppProviders';
import { AuthBootstrap } from '../features/auth/AuthBootstrap';
import { AuthGate } from '../features/auth/AuthGate';

export default function RootLayout() {
  return (
    <AppProviders>
      <AuthBootstrap>
        <StatusBar style="dark" />
        <AuthGate>
          <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="learning" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="companion" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="arena" />
            <Stack.Screen name="settings" />
          </Stack>
        </AuthGate>
      </AuthBootstrap>
    </AppProviders>
  );
}
