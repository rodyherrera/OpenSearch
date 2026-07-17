import { config } from '@/shared/config';
import RuntimeError from '@/shared/errors/RuntimeError';
import UrlNormalizer from '@/modules/crawler/services/UrlNormalizer';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import WebsiteService from '@/modules/website/services/WebsiteService';
import { ScrapeError } from '@/modules/scrape/contracts/domain/errors';
import type { WebsiteDocument } from '@/modules/website/models/Website';
import type { ScrapeBody, ScrapeResult, ScrapeMetadata } from '@/modules/scrape/contracts/domain/scrape';

// On-demand single-page scrape. The crawled index doubles as a cache: a fresh copy
// with markdown is served without touching the network; otherwise we fetch live,
// render markdown, and write it back so the next scrape (and search) benefit.
export default class ScrapeService{
    #fetcher = new PageFetcher();
    #parser = new PageParser();
    #websites = new WebsiteService();

    async scrape(body: ScrapeBody): Promise<ScrapeResult>{
        const url = UrlNormalizer.normalizeUrl(body.url ?? '');
        if(!url) throw new RuntimeError(ScrapeError.InvalidUrl, 400);

        const maxAge = body.maxAge ?? config.publicApi.scrapeCacheMaxAgeMs;
        const includeLinks = body.includeLinks === true;

        if(maxAge > 0){
            const cached = await this.#websites.findByUrl(url);
            if(cached?.markdown && this.#isFresh(cached, maxAge)){
                return this.#fromCache(cached, includeLinks);
            }
        }

        const html = await this.#fetcher.fetch(url, { respectRobots: body.respectRobots === true });
        if(!html) throw new RuntimeError(ScrapeError.FetchFailed, 502);

        const page = this.#parser.parse(html, url, { withMarkdown: true });
        await this.#websites.saveScraped({
            url: page.url,
            title: page.title,
            description: page.description,
            keywords: page.keywords,
            content: page.content,
            markdown: page.markdown ?? '',
            metaData: page.metaData
        });

        return {
            url,
            markdown: page.markdown ?? '',
            metadata: this.#metadata(url, page.title, page.description, page.keywords, page.metaData),
            ...(includeLinks ? { links: page.links } : {}),
            cached: false
        };
    }

    #isFresh(doc: WebsiteDocument, maxAge: number): boolean{
        const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
        return Date.now() - updatedAt <= maxAge;
    }

    #fromCache(doc: WebsiteDocument, includeLinks: boolean): ScrapeResult{
        return {
            url: doc.url,
            markdown: doc.markdown ?? '',
            metadata: this.#metadata(
                doc.url,
                doc.title ?? '',
                doc.description ?? '',
                doc.keywords ?? '',
                (doc.metaData as Record<string, string>) ?? {}
            ),
            // The index stores harvested links only during discovery crawling, not
            // per scrape, so cache hits can't reconstruct them.
            ...(includeLinks ? { links: [] } : {}),
            cached: true
        };
    }

    #metadata(
        url: string,
        title: string,
        description: string,
        keywords: string,
        meta: Record<string, string>
    ): ScrapeMetadata{
        return { ...meta, title, description, keywords, sourceURL: url };
    }
}
