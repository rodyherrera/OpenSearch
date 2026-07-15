import { useRequest } from 'alova/client';
import { useAuthStore } from '@/modules/auth/store/auth';
import { authApi } from '@/modules/auth/api/api';
import type { Session } from '@/shared/contracts/routing/session';

export const useSession = (): Session => {
    const token = useAuthStore((state) => state.token);

    // Fires only on mount (alova useRequest is not watching-state driven). The sign-in flow
    // navigates into the app, which remounts the guard subtree and refetches with the new token;
    // sign-out never fires a stray tokenless /me.
    const { data: user, loading } = useRequest(authApi.me, { immediate: !!token });

    const isAuthenticated = !!token;
    const isLoading = isAuthenticated && loading && !user;

    // Crawlm runs a single bootstrapped admin, so authentication is sufficient for the admin tier.
    const isAdmin = isAuthenticated;

    return { token, user: user ?? null, isAuthenticated, isAdmin, isLoading };
};
