import { useState } from 'react';
import { useRequest } from 'alova/client';
import { useForm } from '@/shared/hooks/forms/useForm';
import { authApi } from '@/modules/auth/api/api';
import { ForgotPasswordSchema } from '@/modules/auth/contracts/auth';
import type { FormApi } from '@/shared/contracts/form';

export interface UseForgotPassword{
    form: FormApi<typeof ForgotPasswordSchema>;
    sent: boolean;
}

export const useForgotPassword = (): UseForgotPassword => {
    const [sent, setSent] = useState(false);
    const request = useRequest(authApi.forgotPassword, { immediate: false });

    const form = useForm({
        schema: ForgotPasswordSchema,
        initialValues: { email: '' },
        onSubmit: async (values) => {
            await request.send(values);
            setSent(true);
        }
    });

    return { form, sent };
};
