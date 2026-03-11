import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../types';

export type SessionUser = Pick<
  User,
  'id' | 'username' | 'display_name' | 'email' | 'avatar_url' | 'bio'
>;

type SessionState = {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
  isAuthenticated: boolean;
  hydrated: boolean;
  setSession: (next: { accessToken: string; refreshToken?: string; user?: SessionUser }) => void;
  setHydrated: () => void;
  clearSession: () => void;
};

const initialState = {
  accessToken: undefined,
  refreshToken: undefined,
  user: undefined,
  isAuthenticated: false,
  hydrated: false,
} satisfies Omit<SessionState, 'setSession' | 'clearSession' | 'setHydrated'>;

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: ({ accessToken, refreshToken, user }) => {
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
          user,
          isAuthenticated: true,
        }));
      },
      clearSession: () => {
        set({
          ...initialState,
          hydrated: true,
        });
      },
      setHydrated: () => {
        set({ hydrated: true });
      },
    }),
    {
      name: 'wai-agents-session',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? {
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            }
          : localStorage,
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
