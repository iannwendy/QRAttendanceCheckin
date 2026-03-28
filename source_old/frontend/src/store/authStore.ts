import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  studentCode?: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password });
        const { accessToken, user } = response.data;
        set({ token: accessToken, user, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-storage');
      },
      checkAuth: async () => {
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ) as any,
);

