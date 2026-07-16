import Bootstrap from '@/core/Bootstrap';
import CertStreamSource from '@/modules/sources/services/CertStreamSource';
import RefreshScheduler from '@/modules/crawler/services/RefreshScheduler';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

/**
 * Standalone orchestrator for external domain-discovery feeds and continuous re-crawl.
 * Runs as its own single process (src/sources.ts) so the firehose consumers and the
 * freshness scheduler stay separate from the crawler workers; everything they queue
 * lands in the shared Redis frontier.
 */
export default class SourcesApplication{
    #bootstrap = new Bootstrap();
    #certstream: CertStreamSource | null = null;
    #refresh = new RefreshScheduler();

    async start(): Promise<void>{
        await this.#bootstrap.initInfra();

        this.#refresh.start();

        if(config.sources.certstreamEnabled){
            this.#certstream = new CertStreamSource();
            this.#certstream.start();
            logger.info('Sources -> CertStream ingestion started.');
        }

        if(!this.#certstream && !config.refresh.enabled){
            logger.warn('Sources -> no external sources or refresh enabled; nothing to do.');
        }
    }

    async stop(): Promise<void>{
        this.#refresh.stop();
        this.#certstream?.stop();
        await this.#bootstrap.shutdown();
    }
}
