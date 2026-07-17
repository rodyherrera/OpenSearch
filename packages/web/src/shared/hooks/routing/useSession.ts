import { useRequest } from 'alova/client';
import { useAuthStore } from '@/modules/auth/store/auth';
import { authApi } from '@/modules/auth/api/api';
import type { Session } from '@/shared/contracts/routing/session';

export const useSession = (): Session => {
    const token = useAuthStore((state) => state.token);

    const { data: user, loading } = useRequest(authApi.me, { immediate: !!token });

    const isAuthenticated = !!token;
    const isLoading = isAuthenticated && loading && !user;

    const isAdmin = isAuthenticated && user?.role === 'admin';

    return { token, user: user ?? null, isAuthenticated, isAdmin, isLoading };
};
