import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import CrawlFrontier, { domainOf } from '@/modules/crawler/services/CrawlFrontier';
import { publishCrawlEvent, publishPageEvent, publishChangeEvent } from '@/modules/crawler/services/CrawlEventPublisher';
import CrawlerControlService from '@/modules/crawler/services/CrawlerControlService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import type { ParsedPage } from '@/modules/extraction/contracts/domain/extraction';
import type { WebsitePageRecord } from '@/modules/website/contracts/domain/website';
import type { MassiveCrawlerOptions } from '@/modules/crawler/contracts/domain/crawl';
import type { Tuning } from '@/modules/crawler/contracts/domain/control';

export default class MassiveCrawler extends EventEmitter{
    #frontier: CrawlFrontier;
    #limit: ReturnType<typeof pLimit>;
    #opts: Required<MassiveCrawlerOptions>;
    #running = false;
    #websites = new WebsiteService();
    #control = new CrawlerControlService();
    #fetcher = new PageFetcher();
    #parser = new PageParser();

    constructor(opts: MassiveCrawlerOptions){
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
            domainDelayMs: this.#opts.domainDelayMs
        });
        this.#limit = pLimit(this.#opts.concurrency);
    }

    getFrontier(): CrawlFrontier{
        return this.#frontier;
    }

    async #crawlOne(url: string): Promise<ParsedPage | null>{
        const html = await this.#fetcher.fetch(url, {
            timeoutMs: this.#opts.timeoutMs,
            respectRobots: this.#opts.respectRobots
        });
        if(!html) return null;
        const record = this.#parser.parse(html, url, {
            maxExternalLinks: this.#opts.maxLinksPerPage,
            maxInternalLinks: config.crawler.maxInternalLinks,
            withMarkdown: false
        });
        if(!record.title) return null;
        const srcDomain = domainOf(record.url);
        const destDomains: string[] = [];
        const seenDest = new Set<string>([srcDomain]);
        for(const link of record.links){
            const d = domainOf(link);
            if(d && !seenDest.has(d)){
                seenDest.add(d);
                destDomains.push(d);
                if(destDomains.length >= 6) break;
            }
        }
        void publishPageEvent(this.#opts.workerId, record.url, record.title, srcDomain, destDomains, Date.now());
        return record;
    }

    // Global discovery pages stay insert-only for throughput; workspace pages go
    // through the update-on-change path so continuous re-crawls refresh changed
    // content and surface change events, bounded to workspace volume.
    async #store(records: ParsedPage[], workspaceByUrl: Map<string, string | null>): Promise<{ stored: number; changed: string[] }>{
        if(!records.length) return { stored: 0, changed: [] };
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
        const changed = workspaceRecords.length
            ? await this.#websites.refreshUpsert(workspaceRecords, workspaceByUrl)
            : [];
        return { stored: globalRecords.length + workspaceRecords.length, changed };
    }

    async #publishChanges(changed: string[], workspaceByUrl: Map<string, string | null>, now: number): Promise<void>{
        const byWorkspace = new Map<string, string[]>();
        for(const url of changed){
            const workspaceId = workspaceByUrl.get(url);
            if(!workspaceId) continue;
            const bucket = byWorkspace.get(workspaceId) ?? [];
            bucket.push(url);
            byWorkspace.set(workspaceId, bucket);
        }
        for(const [workspaceId, urls] of byWorkspace){
            await this.#frontier.recordChanges(workspaceId, urls, now);
            await publishChangeEvent(workspaceId, urls, now);
        }
    }

    async #routeLinks(records: ParsedPage[], workspaceByUrl: Map<string, string | null>): Promise<number>{
        const origins = [...new Set([...workspaceByUrl.values()].filter((id): id is string => Boolean(id)))];
        const domainsByWorkspace = new Map<string, Set<string>>();
        const followExternalByWorkspace = new Map<string, boolean>();
        await Promise.all(origins.map(async (id) => {
            const [domains, followExternal] = await Promise.all([
                this.#frontier.getWorkspaceDomains(id),
                this.#frontier.getWorkspaceFollowExternal(id)
            ]);
            domainsByWorkspace.set(id, domains);
            followExternalByWorkspace.set(id, followExternal);
        }));

        const globalLinks: string[] = [];
        const scopedLinks = new Map<string, string[]>();
        const externalLinks = new Map<string, string[]>();
        const push = (map: Map<string, string[]>, workspaceId: string, link: string) => {
            const bucket = map.get(workspaceId) ?? [];
            bucket.push(link);
            map.set(workspaceId, bucket);
        };

        for(const record of records){
            const workspaceId = workspaceByUrl.get(record.url) ?? null;
            const domains = workspaceId ? domainsByWorkspace.get(workspaceId) : undefined;
            const onSeedDomain = Boolean(domains?.has(domainOf(record.url)));
            const followExternal = workspaceId ? Boolean(followExternalByWorkspace.get(workspaceId)) : false;

            for(const link of record.links){
                if(workspaceId && domains?.has(domainOf(link))){
                    push(scopedLinks, workspaceId, link);
                }else if(workspaceId && followExternal && onSeedDomain){
                    push(externalLinks, workspaceId, link);
                }else{
                    globalLinks.push(link);
                }
            }
        }

        let added = await this.#frontier.enqueue(globalLinks);
        // Same-domain links deep-crawl the seeded site into the workspace, deduped
        // against the workspace's own seen-set so global discovery can't starve it.
        for(const [workspaceId, links] of scopedLinks){
            added += await this.#frontier.enqueueScoped(links, workspaceId);
        }
        // followExternal reaches one hop out: fresh external links crawl once via the
        // global seen-set (no deep crawl), and any already-indexed external pages are
        // adopted into the workspace so the corpus widens either way.
        for(const [workspaceId, links] of externalLinks){
            added += await this.#frontier.enqueue(links, workspaceId);
            void this.#websites.stampWorkspaceByUrls(links, workspaceId);
        }
        return added;
    }

    async #tick(): Promise<number>{
        const items = await this.#frontier.dequeue(this.#opts.batchSize);
        if(!items.length){
            return -1;
        }

        const workspaceByUrl = new Map<string, string | null>(items.map((item) => [item.url, item.workspaceId]));
        const results = await Promise.all(
            items.map((item) => this.#limit(() => this.#crawlOne(item.url)))
        );
        const records = results.filter((r): r is ParsedPage => r !== null);

        const { stored, changed } = await this.#store(records, workspaceByUrl);

        void this.#frontier.recordDomainPages(records.map((r) => domainOf(r.url)), config.crawler.maxPagesPerDomain);

        const added = await this.#routeLinks(records, workspaceByUrl);

        if(changed.length){
            void this.#publishChanges(changed, workspaceByUrl, Date.now());
        }

        if(stored > 0){
            const now = Date.now();
            const total = await this.#frontier.addStored(stored, now);
            const perMin = await this.#frontier.storedPerMin(now);
            const domainsPerMin = await this.#frontier.domainsPerMin(now);
            const workerStat = await this.#frontier.recordWorker(this.#opts.workerId, stored, now);
            const recentPages = records.map((r) => ({
                url: r.url,
                title: r.title,
                worker: this.#opts.workerId,
                at: now
            }));
            await this.#frontier.pushRecent(recentPages);

            const [frontierSize, seen, domains] = await Promise.all([
                this.#frontier.size(),
                this.#frontier.seenCount(),
                this.#frontier.domainCount()
            ]);
            await publishCrawlEvent({
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
                const stored = await this.#frontier.storedCount();
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
