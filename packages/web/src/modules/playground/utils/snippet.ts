import { env } from '@/shared/config/env';
import type { Endpoint } from '@/modules/playground/contracts/playground';

const base = `${env.apiUrl}${env.apiPrefix}`;

export const buildCurl = (endpoint: Endpoint, url: string, limit: number): string => {
    const auth = `-H "Authorization: Bearer os-YOUR_API_KEY"`;
    let value = url.trim() || (endpoint === 'search' ? 'your query' : 'https://example.com');
    if(endpoint !== 'search' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;

    if(endpoint === 'search'){
        const qs = `q=${encodeURIComponent(value)}&limit=${limit}`;
        return `curl "${base}/search?${qs}" \\\n  ${auth}`;
    }

    const body =
        endpoint === 'crawl'
            ? JSON.stringify({ url: value, limit })
            : JSON.stringify({ url: value });

    return `curl -X POST "${base}/${endpoint}" \\\n  ${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
};
