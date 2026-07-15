import Bootstrap from '@/core/Bootstrap';
import CertStreamSource from '@/modules/sources/services/CertStreamSource';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

/**
 * Standalone orchestrator for external domain-discovery feeds. Runs as its own single
 * process (src/sources.ts) so the firehose consumers stay separate from the crawler
 * workers; everything they discover is enqueued into the shared Redis frontier.
 */
export default class SourcesApplication{
    #bootstrap = new Bootstrap();
    #certstream: CertStreamSource | null = null;

    async start(): Promise<void>{
        await this.#bootstrap.initInfra();

        if(config.sources.certstreamEnabled){
            this.#certstream = new CertStreamSource();
            this.#certstream.start();
            logger.info('Sources -> CertStream ingestion started.');
        }

        if(!this.#certstream){
            logger.warn('Sources -> no external sources enabled; nothing to do.');
        }
    }

    async stop(): Promise<void>{
        this.#certstream?.stop();
        await this.#bootstrap.shutdown();
    }
}
