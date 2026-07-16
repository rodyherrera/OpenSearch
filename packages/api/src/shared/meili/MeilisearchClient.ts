import { Meilisearch } from 'meilisearch';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

let client: Meilisearch | null = null;

export const getMeili = (): Meilisearch => {
    if(client) return client;
    client = new Meilisearch({ host: config.search.meili.host, apiKey: config.search.meili.apiKey });
    logger.info('Meilisearch client ready', { scope: 'meili', host: config.search.meili.host });
    return client;
};

export const closeMeili = async (): Promise<void> => {
    client = null;
};
