import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState{
    token: string | null;
    setToken: (token: string | null) => void;
    clear: () => void;
}

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
