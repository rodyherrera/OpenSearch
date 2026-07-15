import { useNavigate } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { useForm } from '@/shared/hooks/forms/useForm';
import { authApi } from '@/modules/auth/api/api';
import { useAuthStore } from '@/modules/auth/store/auth';
import { LoginSchema } from '@/modules/auth/contracts/auth';
import type { FormApi } from '@/shared/contracts/form';

export const useLogin = (): FormApi<typeof LoginSchema> => {
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);
    const login = useRequest(authApi.login, { immediate: false });

    return useForm({
        schema: LoginSchema,
        initialValues: { email: '', password: '' },
        onSubmit: async (values) => {
            const session = await login.send(values);
            setToken(session.token);
            navigate('/');
        }
    });
};
