import { create } from "zustand";
import { api } from "../lib/api";

interface AuthState {
  user: string | null;
  loading: boolean;
  init: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  init: async () => {
    try {
      const { username } = await api.me();
      set({ user: username });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
  register: async (username, password) => {
    const { username: name } = await api.register(username, password);
    set({ user: name });
  },
  login: async (username, password) => {
    const { username: name } = await api.login(username, password);
    set({ user: name });
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
  deleteAccount: async () => {
    await api.deleteAccount();
    set({ user: null });
  },
}));
