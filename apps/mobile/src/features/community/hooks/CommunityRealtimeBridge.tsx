import { PropsWithChildren } from 'react';

import { useAuthStore } from '../../../stores/auth-store';
import { useCommunityRealtime } from './useCommunityRealtime';

export function CommunityRealtimeBridge({ children }: PropsWithChildren) {
  const authenticated = useAuthStore((state) => state.status === 'authenticated');

  if (authenticated) {
    return <AuthenticatedCommunityRealtimeBridge>{children}</AuthenticatedCommunityRealtimeBridge>;
  }

  return children;
}

function AuthenticatedCommunityRealtimeBridge({ children }: PropsWithChildren) {
  useCommunityRealtime();
  return children;
}
