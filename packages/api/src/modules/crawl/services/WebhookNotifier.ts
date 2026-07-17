import { httpClient } from '@/shared/http/HttpClient';
import { logger } from '@/core/utils/Logger';

const TIMEOUT_MS = 10000;

export default class WebhookNotifier{
    async notify(url: string, event: string, payload: unknown): Promise<void>{
        try{
            await httpClient.post(url, { event, data: payload }, {
                timeout: TIMEOUT_MS,
                headers: { 'Content-Type': 'application/json' }
            });
        }catch(error){
            logger.warn(`webhook delivery failed for ${url}`, { scope: 'crawl', error: String(error) });
        }
    }
}
