import { createAlova } from 'alova';
import type { ApiResponse, ApiErrorResponse } from '@/shared/contracts/http';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/modules/auth/store/auth';
import { ApiError } from '@/shared/services/ApiError';
import adapterFetch from 'alova/fetch';
import ReactHook from 'alova/react';

export const alova = createAlova({
    baseURL: env.apiUrl + env.apiPrefix,
    requestAdapter: adapterFetch(),
    statesHook: ReactHook,
    cacheFor: {
        GET: 30_000,
    },

    beforeRequest(method){
        const token = useAuthStore.getState().token;
        method.config.headers['Content-Type'] = 'application/json';
        if(token) method.config.headers.Authorization = `Bearer ${token}`;
    },

    responded: {
        async onSuccess(response){
            const payload = response.status === 204
                ? undefined
                : await response.json().catch(() => undefined);

            if(!response.ok){
                const message = (payload as ApiErrorResponse | undefined)?.error ?? response.statusText;
                throw new ApiError(response.status, message, payload);
            }

            return (payload as ApiResponse<unknown> | undefined)?.data;
        },

        onError(error){
            if(error instanceof ApiError) throw error;
            throw new ApiError(0, 'Network request failed', undefined, { cause: error });
        },
    },
});
