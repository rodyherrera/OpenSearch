import RuntimeError from '@/shared/errors/RuntimeError';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import PageFetcher from '@/modules/extraction/services/PageFetcher';
import PageParser from '@/modules/extraction/services/PageParser';
import WebsiteService from '@/modules/website/services/WebsiteService';
import SitemapReader from '@/modules/map/services/SitemapReader';
import { MapError } from '@/modules/map/contracts/domain/errors';
import type { MapBody, MapResponse } from '@/modules/map/contracts/domain/map';

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

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
        return this.#parser.parse(html, url, { maxExternalLinks: 2000, maxInternalLinks: 2000 }).links;
    }
}
