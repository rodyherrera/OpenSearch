import { env } from '@/shared/config/env';

const toWebSocketBase = (httpUrl: string): string => httpUrl.replace(/^http/, 'ws');

export const wsUrl = (path: string): string => {
    const base = toWebSocketBase(env.apiUrl).replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
};
