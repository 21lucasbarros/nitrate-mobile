import { create } from 'zustand';

import { clearToken, loadToken, saveToken } from './token-storage';

interface AuthStore {
  /** undefined enquanto lê o token guardado no aparelho */
  token: string | null | undefined;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: undefined,
  hydrate: async () => {
    try {
      set({ token: await loadToken() });
    } catch {
      set({ token: null });
    }
  },
  signIn: async (token) => {
    await saveToken(token);
    set({ token });
  },
  signOut: async () => {
    set({ token: null });
    await clearToken();
  },
}));
