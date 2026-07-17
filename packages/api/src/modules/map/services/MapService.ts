import RuntimeError from '@/shared/errors/RuntimeError';
import UrlNormalizer from '@/modules/crawler/services/UrlNormalizer';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import WebsiteService from '@/modules/website/services/WebsiteService';
import SitemapReader from '@/modules/map/services/SitemapReader';
import { MapError } from '@/modules/map/contracts/domain/errors';
import type { MapBody, MapResponse } from '@/modules/map/contracts/domain/map';

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

// Discovers the URLs of a site by merging three sources: its sitemap.xml, the links
// on its homepage, and everything we've already indexed for that domain. The index
// contribution is the edge a stateless scraper lacks — instant known-URL coverage.
export default class MapService{
    #fetcher = new PageFetcher();
    #parser = new PageParser();
    #websites = new WebsiteService();
    #sitemap = new SitemapReader();

    async map(body: MapBody): Promise<MapResponse>{
        const url = UrlNormalizer.normalizeUrl(body.url ?? '');
        if(!url) throw new RuntimeError(MapError.InvalidUrl, 400);

        const parsed = new URL(url);
        const origin = `${parsed.protocol}//${parsed.host}`;
        const domain = UrlNormalizer.domainOf(url);
        const limit = Math.min(Math.max(body.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
        const includeIndex = body.includeIndex !== false;

        const [sitemapUrls, homepageLinks, indexUrls] = await Promise.all([
            this.#sitemap.read(origin),
            this.#homepageLinks(url),
            includeIndex && domain ? this.#websites.listUrlsByDomain(domain, MAX_LIMIT) : Promise.resolve([])
        ]);

        // Same-site only, deduped, deterministic order (sitemap → homepage → index).
        const term = body.search?.trim().toLowerCase();
        const seen = new Set<string>();
        const links: string[] = [];
        for(const candidate of [...sitemapUrls, ...homepageLinks, ...indexUrls]){
            const normalized = UrlNormalizer.normalizeUrl(candidate);
            if(!normalized || seen.has(normalized)) continue;
            if(domain && UrlNormalizer.domainOf(normalized) !== domain) continue;
            if(term && !normalized.toLowerCase().includes(term)) continue;
            seen.add(normalized);
            links.push(normalized);
            if(links.length >= limit) break;
        }

        return { url, total: links.length, links };
    }

    async #homepageLinks(url: string): Promise<string[]>{
        const html = await this.#fetcher.fetch(url);
        if(!html) return [];
        // Harvest generously here — for mapping we want breadth, not the crawler's
        // external-first bias, so lift both caps well above the discovery defaults.
        return this.#parser.parse(html, url, { maxExternalLinks: 2000, maxInternalLinks: 2000 }).links;
    }
}
