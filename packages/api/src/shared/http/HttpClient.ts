import axios, { type AxiosInstance } from 'axios';
import http from 'node:http';
import https from 'node:https';
import CacheableLookup from 'cacheable-lookup';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

export const USER_AGENT = 'CrawlmBot/1.0 (+https://github.com/rodyherrera/Crawlm)';

const MAX_SOCKETS = Math.max(256, config.crawler.concurrency * 2);
const dnsCache = new CacheableLookup();

const agentOptions: http.AgentOptions = {
    keepAlive: true,
    keepAliveMsecs: 15000,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: 256,
    scheduling: 'fifo'
};
const httpAgent = new http.Agent(agentOptions);
const httpsAgent = new https.Agent(agentOptions);
dnsCache.install(httpAgent);
dnsCache.install(httpsAgent);

export const httpClient: AxiosInstance = axios.create({
    httpAgent,
    httpsAgent,
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

export const fetchText = async (url: string, options: FetchHtmlOptions = {}): Promise<string> => {
    const { timeoutMs = config.crawler.timeoutMs, maxBytes = DEFAULT_MAX_BYTES } = options;
    try{
        const response = await httpClient.get<string>(url, {
            timeout: timeoutMs,
            maxContentLength: maxBytes,
            maxRedirects: 5,
            responseType: 'text',
            validateStatus: (status) => status >= 200 && status < 400
        });
        return typeof response.data === 'string' ? response.data : '';
    }catch(error){
        logger.debug(`fetch text failed ${url}`, { scope: 'http', error: String(error) });
        return '';
    }
};
