import type { SessionAdmin } from '@/modules/auth/contracts/auth';

export interface Session{
    token: string | null;
    user: SessionAdmin | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
}
