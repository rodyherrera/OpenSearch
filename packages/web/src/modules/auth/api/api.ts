import { alova } from '@/app/alova';
import type {
    LoginInput,
    RegisterInput,
    ForgotPasswordInput,
    AuthSession,
    SessionAdmin
} from '@/modules/auth/contracts/auth';

const BASE = '/auth';

export const authApi = {
    login: (body: LoginInput) => alova.Post<AuthSession>(`${BASE}/login`, body),
    register: (body: RegisterInput) => alova.Post<AuthSession>(`${BASE}/register`, body),
    forgotPassword: (body: ForgotPasswordInput) => alova.Post<{ ok: true }>(`${BASE}/forgot-password`, body),
    resetPassword: (body: { token: string; password: string }) => alova.Post<AuthSession>(`${BASE}/reset-password`, body),
    me: () => alova.Get<SessionAdmin>(`${BASE}/me`)
};
