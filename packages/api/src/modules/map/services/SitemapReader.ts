import { load } from 'cheerio';
import { fetchText } from '@/shared/http/HttpClient';

// Follow at most this many child sitemaps from a sitemap index, so a site with
// hundreds of shards can't turn one /map call into a fetch storm.
const MAX_CHILD_SITEMAPS = 5;
const FETCH_TIMEOUT_MS = 10000;

// Reads a site's sitemap(s) into a flat URL list. Handles both a urlset (leaf
// sitemap) and a sitemapindex (which points at child sitemaps) in one pass.
export default class SitemapReader{
    async read(origin: string): Promise<string[]>{
        const xml = await fetchText(`${origin}/sitemap.xml`, { timeoutMs: FETCH_TIMEOUT_MS });
        if(!xml) return [];

        const { childSitemaps, urls } = this.#parse(xml);
        if(!childSitemaps.length) return urls;

        const childResults = await Promise.all(
            childSitemaps.slice(0, MAX_CHILD_SITEMAPS).map((sitemap) =>
                fetchText(sitemap, { timeoutMs: FETCH_TIMEOUT_MS }).then((body) => (body ? this.#parse(body).urls : []))
            )
        );
        return [...urls, ...childResults.flat()];
    }

    #parse(xml: string): { childSitemaps: string[]; urls: string[] }{
        const $ = load(xml, { xmlMode: true });
        const childSitemaps: string[] = [];
        const urls: string[] = [];

        $('sitemap > loc').each((_, el) => {
            const loc = $(el).text().trim();
            if(loc) childSitemaps.push(loc);
        });
        $('url > loc').each((_, el) => {
            const loc = $(el).text().trim();
            if(loc) urls.push(loc);
        });

        return { childSitemaps, urls };
    }
}
