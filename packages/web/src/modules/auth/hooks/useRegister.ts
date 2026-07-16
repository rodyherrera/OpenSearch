import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRequest } from 'alova/client';
import { useForm } from '@/shared/hooks/forms/useForm';
import { authApi } from '@/modules/auth/api/api';
import { useAuthStore } from '@/modules/auth/store/auth';
import { RegisterSchema } from '@/modules/auth/contracts/auth';
import { safeNext } from '@/modules/auth/utils/next';
import type { FormApi } from '@/shared/contracts/form';

export const useRegister = (): FormApi<typeof RegisterSchema> => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const setToken = useAuthStore((state) => state.setToken);
    const register = useRequest(authApi.register, { immediate: false });

    return useForm({
        schema: RegisterSchema,
        initialValues: { email: '', password: '' },
        onSubmit: async (values) => {
            const session = await register.send(values);
            setToken(session.token);
            navigate(safeNext(params.get('next')));
        }
    });
};
