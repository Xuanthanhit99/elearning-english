import { create } from 'zustand';

import type { AuthUser } from '@/features/auth/types/auth.types';

export type AuthStatus =
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;

  setAuthenticated: (
    user: AuthUser,
  ) => void;

  setUnauthenticated: () => void;

  setBootstrapping: () => void;
};

export const useAuthStore =
  create<AuthState>((set) => ({
    status: 'bootstrapping',

    user: null,

    setAuthenticated: (user) =>
      set({
        status: 'authenticated',
        user,
      }),

    setUnauthenticated: () =>
      set({
        status: 'unauthenticated',
        user: null,
      }),

    setBootstrapping: () =>
      set({
        status: 'bootstrapping',
      }),
  }));