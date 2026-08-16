import { QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CommunityRealtimeBridge } from '../features/community/hooks/CommunityRealtimeBridge';
import { NotificationRealtimeBridge } from '../features/notifications/hooks/NotificationRealtimeBridge';
import { queryClient } from '../services/query/query-client';
import { SocketLifecycle } from '../services/socket/SocketLifecycle';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SocketLifecycle>
            <NotificationRealtimeBridge>
              <CommunityRealtimeBridge>{children}</CommunityRealtimeBridge>
            </NotificationRealtimeBridge>
          </SocketLifecycle>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
