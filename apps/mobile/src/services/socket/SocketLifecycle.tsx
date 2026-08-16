import { PropsWithChildren, useEffect } from 'react';

import { useAuthStore } from '../../stores/auth-store';
import { setSocketAuthenticationEnabled } from './socket-manager';

export function SocketLifecycle({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void setSocketAuthenticationEnabled(status === 'authenticated');
  }, [status]);

  return children;
}
