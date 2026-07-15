import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import { load } from 'cheerio';
import { config } from '@/shared/config';
import { fetchHtml } from '@/shared/http/HttpClient';
import { logger } from '@/core/utils/Logger';
import CrawlFrontier, { normalizeUrl, domainOf } from '@/modules/crawler/services/CrawlFrontier';
import { isAllowed } from '@/modules/crawler/services/RobotsGuard';
import { publishCrawlEvent, publishPageEvent } from '@/modules/crawler/services/CrawlEventPublisher';
import CrawlerControlService from '@/modules/crawler/services/CrawlerControlService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { WebsitePageRecord } from '@/modules/website/contracts/domain/website';
import type { MassiveCrawlerOptions } from '@/modules/crawler/contracts/domain/crawl';
import type { Tuning } from '@/modules/crawler/contracts/domain/control';

interface PageRecord{
    url: string;
    title: string;
    description: string;
    keywords: string;
    content: string;
    metaData: Record<string, string>;
    links: string[];
}

export default class MassiveCrawler extends EventEmitter{
    #frontier: CrawlFrontier;
    #limit: ReturnType<typeof pLimit>;
    #opts: Required<MassiveCrawlerOptions>;
    #running = false;
    #websites = new WebsiteService();
    #control = new CrawlerControlService();

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

    async #fetchHTML(url: string): Promise<string>{
        return fetchHtml(url, { timeoutMs: this.#opts.timeoutMs });
    }

    #parse(html: string, url: string): PageRecord{
        const $ = load(html);
        const title = $('head > title').text().trim();
        const description = $('meta[name="description"]').attr('content')?.trim() || '';

        const metaData: Record<string, string> = {};
        $('meta').each((_, el) => {
            const name = $(el).attr('name') || $(el).attr('property');
            const content = $(el).attr('content');
            if(name && content) metaData[name] = content;
        });

        const keywords = metaData['keywords'] || '';

        // Bias link harvesting toward EXTERNAL domains (the ones that grow coverage):
        // keep every external link up to the cap, but only a handful of internal ones.
        const srcDomain = domainOf(url);
        const maxExternal = this.#opts.maxLinksPerPage;
        const maxInternal = config.crawler.maxInternalLinks;
        const externals: string[] = [];
        const internals: string[] = [];
        const seen = new Set<string>();
        $('a[href]').each((_, el) => {
            if(externals.length >= maxExternal && internals.length >= maxInternal) return;
            const href = $(el).attr('href');
            if(!href) return;
            try{
                const normalized = normalizeUrl(new URL(href, url).toString());
                if(!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                const linkDomain = domainOf(normalized);
                if(linkDomain && linkDomain !== srcDomain){
                    if(externals.length < maxExternal) externals.push(normalized);
                }else if(internals.length < maxInternal){
                    internals.push(normalized);
                }
            }catch{
            }
        });

        $('script, style, noscript, svg, nav, footer, header, form, iframe').remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const content = bodyText.slice(0, 2000);

        return { url, title, description, keywords, content, metaData, links: [...externals, ...internals] };
    }

    async #crawlOne(url: string): Promise<PageRecord | null>{
        if(this.#opts.respectRobots){
            const allowed = await isAllowed(url);
            if(!allowed){
                logger.debug(`robots.txt disallows ${url}`);
                return null;
            }
        }
        const html = await this.#fetchHTML(url);
        if(!html) return null;
        const record = this.#parse(html, url);
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

    async #store(records: PageRecord[]): Promise<number>{
        if(!records.length) return 0;
        const bulk: WebsitePageRecord[] = records.map(({ url, title, description, keywords, content, metaData }) => ({
            url,
            title,
            description,
            keywords,
            content,
            metaData
        }));
        return this.#websites.bulkUpsert(bulk);
    }

    async #tick(): Promise<number>{
        const urls = await this.#frontier.dequeue(this.#opts.batchSize);
        if(!urls.length){
            return -1;
        }

        const results = await Promise.all(
            urls.map((url) => this.#limit(() => this.#crawlOne(url)))
        );
        const records = results.filter((r): r is PageRecord => r !== null);

        const stored = await this.#store(records);

        // Count pages per domain so the frontier can saturate (and stop chasing) sites
        // that have given up enough pages — pushing the crawl toward fresh domains.
        void this.#frontier.recordDomainPages(records.map((r) => domainOf(r.url)), config.crawler.maxPagesPerDomain);

        const discovered = records.flatMap((r) => r.links);
        const added = await this.#frontier.enqueue(discovered);

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

    // Apply live tuning coming from CrawlerControlService. #opts doubles as the
    // "current" snapshot we diff against to detect concurrency/delay changes.
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
