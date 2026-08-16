import { PropsWithChildren } from 'react';

import { useAuthStore } from '../../../stores/auth-store';
import { useNotificationRealtime } from './useNotificationRealtime';

export function NotificationRealtimeBridge({ children }: PropsWithChildren) {
  const authenticated = useAuthStore((state) => state.status === 'authenticated');

  if (authenticated) {
    return <AuthenticatedNotificationRealtimeBridge>{children}</AuthenticatedNotificationRealtimeBridge>;
  }

  return children;
}

function AuthenticatedNotificationRealtimeBridge({ children }: PropsWithChildren) {
  useNotificationRealtime();
  return children;
}
