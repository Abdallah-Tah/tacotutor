import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';
import { authAPI } from '@/services/api';

interface AuthStore extends AuthState {
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      init: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await authAPI.me();
          set({ user: res.data, token, isAuthenticated: true });
        } catch {
          localStorage.removeItem('token');
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
