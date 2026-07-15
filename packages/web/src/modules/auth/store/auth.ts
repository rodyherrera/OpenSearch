import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState{
    token: string | null;
    setToken: (token: string | null) => void;
    clear: () => void;
}

// Persisted to localStorage: the single bootstrapped operator must survive reloads.
export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            setToken: (token) => set({ token }),
            clear: () => set({ token: null })
        }),
        { name: 'crawlm.auth' }
    )
);
