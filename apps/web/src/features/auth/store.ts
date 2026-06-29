import type { CurrentUser } from '@ifsuv/shared';
import { create } from 'zustand';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  currentUser: CurrentUser | null;
  status: AuthStatus;
  setUser: (user: CurrentUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  status: 'idle',
  setUser: (user) =>
    set({
      currentUser: user,
      status: user ? 'authenticated' : 'unauthenticated',
    }),
  setStatus: (status) => set({ status }),
  clear: () => set({ currentUser: null, status: 'unauthenticated' }),
}));
