import { alova } from '@/app/alova';
import type { LoginInput, AuthSession, SessionAdmin } from '@/modules/auth/contracts/auth';

const BASE = '/auth';

export const authApi = {
    login: (body: LoginInput) => alova.Post<AuthSession>(`${BASE}/login`, body),
    me: () => alova.Get<SessionAdmin>(`${BASE}/me`)
};
