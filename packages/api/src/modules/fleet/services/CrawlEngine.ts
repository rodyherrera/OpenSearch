import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import CrawlFrontier from '@/modules/fleet/services/CrawlFrontier';
import WorkspaceFrontier from '@/modules/fleet/services/WorkspaceFrontier';
import CrawlMetrics from '@/modules/fleet/services/CrawlMetrics';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import LinkRouter from '@/modules/fleet/services/LinkRouter';
import WorkspaceNotifier from '@/modules/fleet/services/WorkspaceNotifier';
import CrawlEventPublisher from '@/modules/fleet/services/CrawlEventPublisher';
import FleetControlService from '@/modules/fleet/services/FleetControlService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import type { ParsedPage } from '@/modules/extraction/contracts/domain/extraction';
import type { WebsitePageRecord, RefreshResult } from '@/modules/website/contracts/domain/website';
import type { CrawlEngineOptions, WorkspaceByUrl } from '@/modules/fleet/contracts/domain/crawl';
import type { Tuning } from '@/modules/fleet/contracts/domain/control';

interface StoreResult extends RefreshResult{
    stored: number;
}

export default class CrawlEngine extends EventEmitter{
    #frontier: CrawlFrontier;
    #workspaceFrontier = new WorkspaceFrontier();
    #metrics = new CrawlMetrics();
    #publisher = new CrawlEventPublisher();
    #control = new FleetControlService();
    #websites = new WebsiteService();
    #fetcher = new PageFetcher();
    #parser = new PageParser();
    #linkRouter: LinkRouter;
    #notifier: WorkspaceNotifier;
    #limit: ReturnType<typeof pLimit>;
    #opts: Required<CrawlEngineOptions>;
    #running = false;

    constructor(opts: CrawlEngineOptions){
        super();
        this.#opts = {
            workerId: opts.workerId ?? 'worker',
            concurrency: opts.concurrency ?? config.crawler.concurrency,
            batchSize: opts.batchSize ?? config.crawler.batchSize,
            domainDelayMs: opts.domainDelayMs ?? config.crawler.domainDelayMs,
            maxLinksPerPage: opts.maxLinksPerPage ?? config.crawler.maxLinksPerPage,
            maxFrontier: opts.maxFrontier ?? config.crawler.maxFrontier,
            maxPages: opts.maxPages ?? config.crawler.maxPages,
            respectRobots: opts.respectRobots ?? config.crawler.respectRobots,
            timeoutMs: opts.timeoutMs ?? config.crawler.timeoutMs
        };
        this.#frontier = new CrawlFrontier({
            maxFrontier: this.#opts.maxFrontier,
            domainDelayMs: this.#opts.domainDelayMs,
            workspaceDomainDelayMs: config.crawler.workspaceDomainDelayMs,
            workspaceDomainConcurrency: config.crawler.workspaceDomainConcurrency
        });
        this.#linkRouter = new LinkRouter(this.#frontier, this.#workspaceFrontier, this.#websites);
        this.#notifier = new WorkspaceNotifier(this.#workspaceFrontier);
        this.#limit = pLimit(this.#opts.concurrency);
    }

    getFrontier(): CrawlFrontier{
        return this.#frontier;
    }

    async #crawlOne(url: string, isWorkspace: boolean): Promise<ParsedPage | null>{
        const html = await this.#fetcher.fetch(url, {
            timeoutMs: this.#opts.timeoutMs,
            respectRobots: this.#opts.respectRobots
        });
        if(!html) return null;
        const record = this.#parser.parse(html, url, {
            maxExternalLinks: this.#opts.maxLinksPerPage,
            maxInternalLinks: isWorkspace ? config.crawler.workspaceMaxInternalLinks : config.crawler.maxInternalLinks,
            withMarkdown: false
        });
        if(!record.title) return null;
        const srcDomain = UrlNormalizer.domainOf(record.url);
        const destDomains: string[] = [];
        const seenDest = new Set<string>([srcDomain]);
        for(const link of record.links){
            const d = UrlNormalizer.domainOf(link);
            if(d && !seenDest.has(d)){
                seenDest.add(d);
                destDomains.push(d);
                if(destDomains.length >= 6) break;
            }
        }
        void this.#publisher.publishPageEvent(this.#opts.workerId, record.url, record.title, srcDomain, destDomains, Date.now());
        return record;
    }

    async #store(records: ParsedPage[], workspaceByUrl: WorkspaceByUrl): Promise<StoreResult>{
        if(!records.length) return { stored: 0, inserted: [], changed: [] };
        const toRecord = ({ url, title, description, keywords, content, metaData }: ParsedPage): WebsitePageRecord => ({
            url,
            title,
            description,
            keywords,
            content,
            metaData
        });
        const globalRecords: WebsitePageRecord[] = [];
        const workspaceRecords: WebsitePageRecord[] = [];
        for(const record of records){
            (workspaceByUrl.get(record.url) ? workspaceRecords : globalRecords).push(toRecord(record));
        }
        await this.#websites.bulkUpsert(globalRecords);
        const { inserted, changed } = workspaceRecords.length
            ? await this.#websites.refreshUpsert(workspaceRecords, workspaceByUrl)
            : { inserted: [], changed: [] };
        return { stored: globalRecords.length + workspaceRecords.length, inserted, changed };
    }

    async #tick(): Promise<number>{
        const items = await this.#frontier.dequeue(this.#opts.batchSize);
        if(!items.length){
            return -1;
        }

        const workspaceByUrl: WorkspaceByUrl = new Map(items.map((item) => [item.url, item.workspaceId]));
        const results = await Promise.all(
            items.map((item) => this.#limit(() => this.#crawlOne(item.url, Boolean(item.workspaceId))))
        );
        const records = results.filter((r): r is ParsedPage => r !== null);

        const { stored, inserted, changed } = await this.#store(records, workspaceByUrl);

        void this.#frontier.recordDomainPages(records.map((r) => UrlNormalizer.domainOf(r.url)), config.crawler.maxPagesPerDomain);

        const added = await this.#linkRouter.route(records, workspaceByUrl);

        if(inserted.length){
            void this.#notifier.notifyIndexed(inserted, records, workspaceByUrl, Date.now());
        }
        if(changed.length){
            void this.#notifier.notifyChanges(changed, workspaceByUrl, Date.now());
        }

        if(stored > 0){
            const now = Date.now();
            const total = await this.#metrics.addStored(stored, now);
            const perMin = await this.#metrics.storedPerMin(now);
            const domainsPerMin = await this.#frontier.domainsPerMin(now);
            const workerStat = await this.#metrics.recordWorker(this.#opts.workerId, stored, now);
            const recentPages = records.map((r) => ({
                url: r.url,
                title: r.title,
                worker: this.#opts.workerId,
                at: now
            }));
            await this.#metrics.pushRecent(recentPages);

            const [frontierSize, seen, domains] = await Promise.all([
                this.#frontier.size(),
                this.#frontier.seenCount(),
                this.#frontier.domainCount()
            ]);
            await this.#publisher.publishCrawlEvent({
                type: 'batch',
                worker: this.#opts.workerId,
                stored,
                workerStored: workerStat.stored,
                totalStored: total,
                perMin,
                domainsPerMin,
                frontier: frontierSize,
                seen,
                domains,
                discovered: added,
                at: now
            });

            this.emit('batchStored', { stored, discovered: added, totalStored: total, perMin });
            logger.info(`Crawler[${this.#opts.workerId}] -> stored ${stored} pages (+${added} queued). Total: ${total} | ~${perMin} pages/min.`);
        }
        return stored;
    }

    async run(): Promise<void>{
        this.#running = true;
        this.emit('started', { options: this.#opts });
        let idleTicks = 0;

        while(this.#running){
            const control = await this.#control.getControl();
            if(control.paused){
                this.emit('paused', {});
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            this.#applyTuning(control.tuning);

            if(this.#opts.maxPages > 0){
                const stored = await this.#metrics.storedCount();
                if(stored >= this.#opts.maxPages){
                    logger.info(`Crawler -> reached maxPages (${this.#opts.maxPages}). Stopping.`);
                    break;
                }
            }

            const stored = await this.#tick();

            if(stored < 0){
                const size = await this.#frontier.size();
                if(size === 0){
                    idleTicks++;
                    this.emit('idle', { idleTicks });
                    if(idleTicks >= 5){
                        logger.info('Crawler -> frontier drained. Stopping.');
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }else{
                    await new Promise((resolve) => setTimeout(resolve, Math.min(250, this.#opts.domainDelayMs)));
                }
            }else{
                idleTicks = 0;
            }
        }

        this.#running = false;
        this.emit('stopped', {});
    }

    stop(): void{
        this.#running = false;
    }

    #applyTuning(t: Tuning): void{
        this.#opts.batchSize = t.batchSize;
        this.#opts.maxLinksPerPage = t.maxLinksPerPage;
        this.#opts.timeoutMs = t.timeoutMs;
        this.#opts.respectRobots = t.respectRobots;

        if(t.concurrency !== this.#opts.concurrency){
            this.#opts.concurrency = t.concurrency;
            this.#limit = pLimit(t.concurrency);
        }

        if(t.domainDelayMs !== this.#opts.domainDelayMs){
            this.#opts.domainDelayMs = t.domainDelayMs;
            this.#frontier.setDomainDelay(t.domainDelayMs);
        }
    }
}
