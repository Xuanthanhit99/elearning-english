import { create } from 'zustand';

import type { CurrentUser } from '../features/auth/types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  setLoading: () => void;
  setAuthenticated: (user: CurrentUser) => void;
  setUnauthenticated: () => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  setLoading: () => set({ status: 'loading' }),
  setAuthenticated: (user) => set({ status: 'authenticated', user }),
  setUnauthenticated: () => set({ status: 'unauthenticated', user: null }),
  reset: () => set({ status: 'unauthenticated', user: null }),
}));
