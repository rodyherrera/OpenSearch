import { env } from '@/shared/config/env';

// http:// -> ws://, https:// -> wss:// (a leading `https` already contains `http`).
const toWebSocketBase = (httpUrl: string): string => httpUrl.replace(/^http/, 'ws');

/** Full ws(s):// URL for a channel path, derived from the API host. */
export const wsUrl = (path: string): string => {
    const base = toWebSocketBase(env.apiUrl).replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
};
