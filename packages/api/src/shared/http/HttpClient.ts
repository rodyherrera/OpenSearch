import axios, { type AxiosInstance } from 'axios';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

const USER_AGENT = 'CrawlmBot/1.0 (+https://github.com/rodyherrera/Crawlm)';

export const httpClient: AxiosInstance = axios.create({
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    },
    decompress: true
});

export interface FetchHtmlOptions{
    timeoutMs?: number;
    maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

export const fetchHtml = async (url: string, options: FetchHtmlOptions = {}): Promise<string> => {
    const { timeoutMs = config.crawler.timeoutMs, maxBytes = DEFAULT_MAX_BYTES } = options;
    try{
        const response = await httpClient.get<string>(url, {
            timeout: timeoutMs,
            maxContentLength: maxBytes,
            maxRedirects: 5,
            responseType: 'text',
            validateStatus: (status) => status >= 200 && status < 400
        });
        const contentType = String(response.headers['content-type'] || '');
        if(!contentType.includes('html')) return '';
        return typeof response.data === 'string' ? response.data : '';
    }catch(error){
        logger.debug(`fetch failed ${url}`, { scope: 'http', error: String(error) });
        return '';
    }
};
