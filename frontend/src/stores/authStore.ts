import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('authToken'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authApi.login(email, password);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authApi.register(email, password);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  getCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isLoading: false });
    } catch (error: any) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false });
      throw error;
    }
  },
}));
