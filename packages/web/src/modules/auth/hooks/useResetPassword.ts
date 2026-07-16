import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { useForm } from '@/shared/hooks/forms/useForm';
import { authApi } from '@/modules/auth/api/api';
import { useAuthStore } from '@/modules/auth/store/auth';
import { ResetPasswordSchema } from '@/modules/auth/contracts/auth';
import type { FormApi } from '@/shared/contracts/form';

export interface UseResetPassword{
    form: FormApi<typeof ResetPasswordSchema>;
    hasToken: boolean;
}

export const useResetPassword = (): UseResetPassword => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const setToken = useAuthStore((state) => state.setToken);
    const reset = useRequest(authApi.resetPassword, { immediate: false });

    const form = useForm({
        schema: ResetPasswordSchema,
        initialValues: { password: '', confirm: '' },
        onSubmit: async (values) => {
            const session = await reset.send({ token, password: values.password });
            setToken(session.token);
            navigate('/');
        }
    });

    return { form, hasToken: !!token };
};
