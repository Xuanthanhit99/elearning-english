type AccessTokenListener = (accessToken: string | null) => void;

const listeners = new Set<AccessTokenListener>();

export function subscribeToAccessTokenChanges(listener: AccessTokenListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAccessTokenChanged(accessToken: string | null) {
  listeners.forEach((listener) => listener(accessToken));
}
