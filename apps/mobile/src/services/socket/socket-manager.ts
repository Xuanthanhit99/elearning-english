import { io, Socket } from 'socket.io-client';

import { env } from '../../config/env';
import { getAccessToken } from '../auth/token-storage';
import { useAuthStore } from '../../stores/auth-store';
import { subscribeToAccessTokenChanges } from './socket-auth';
import type { SocketNamespace } from './namespaces';

type ManagedSocket = Socket & {
  auth: {
    token?: string;
  };
};

const sockets = new Map<SocketNamespace, ManagedSocket>();
let authenticated = false;
let sessionVersion = 0;

const socketBaseUrl = env.socketUrl || env.apiUrl;

subscribeToAccessTokenChanges((token) => {
  if (!token) {
    disconnectAuthenticatedSockets();
    return;
  }

  updateSocketAuthToken(token);
});

export async function setSocketAuthenticationEnabled(enabled: boolean) {
  if (authenticated === enabled) return;
  authenticated = enabled;
  sessionVersion += 1;

  if (!enabled) {
    disconnectAuthenticatedSockets();
  } else {
    const token = await getAccessToken();
    if (authenticated && token) {
      updateSocketAuthToken(token);
    }
  }
}

export async function getAuthenticatedSocket(namespace: SocketNamespace) {
  if (!isAuthenticated() || !socketBaseUrl) return null;

  const token = await getAccessToken();
  if (!token || !isAuthenticated()) return null;

  const existing = sockets.get(namespace);
  if (existing) {
    existing.auth.token = token;
    if (!existing.connected && !existing.active) {
      existing.connect();
    }
    return existing;
  }

  const createdAtVersion = sessionVersion;
  const socket = io(`${socketBaseUrl}${namespace}`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  }) as ManagedSocket;

  socket.on('connect_error', () => {
    if (!isAuthenticated() || createdAtVersion !== sessionVersion) {
      socket.disconnect();
    }
  });

  socket.on('disconnect', () => {
    if (!isAuthenticated() || createdAtVersion !== sessionVersion) {
      socket.removeAllListeners();
    }
  });

  sockets.set(namespace, socket);
  socket.connect();
  return socket;
}

export function disconnectAuthenticatedSockets() {
  sessionVersion += 1;
  sockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.auth.token = undefined;
    socket.disconnect();
  });
  sockets.clear();
}

function updateSocketAuthToken(token: string) {
  sockets.forEach((socket) => {
    socket.auth.token = token;
    if (isAuthenticated()) {
      socket.disconnect();
      socket.connect();
    }
  });
}

function isAuthenticated() {
  return authenticated || useAuthStore.getState().status === 'authenticated';
}
