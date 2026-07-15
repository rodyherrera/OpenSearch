import { load, type CheerioAPI } from 'cheerio';
import TurndownService from 'turndown';
import { config } from '@/shared/config';
import { normalizeUrl, domainOf } from '@/modules/crawler/services/CrawlFrontier';
import type { ParsedPage, ParseOptions } from '@/modules/extraction/contracts/domain/extraction';

const DEFAULT_CONTENT_CHARS = 2000;
// Chrome, layout and script noise stripped before extracting text/markdown.
const NOISE_SELECTOR = 'script, style, noscript, svg, nav, footer, header, form, iframe';

// One shared Turndown instance: it is stateless across calls, so building it once
// avoids re-registering rules on every parse.
const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});
turndown.remove(['script', 'style', 'noscript', 'iframe', 'form']);

// Turns one fetched HTML document into the shared ParsedPage shape. This is the
// single source of truth for "what a page becomes" — the massive crawler and the
// on-demand endpoints both parse here, differing only via ParseOptions.
export default class PageParser{
    parse(html: string, url: string, options: ParseOptions = {}): ParsedPage{
        const {
            maxExternalLinks = config.crawler.maxLinksPerPage,
            maxInternalLinks = config.crawler.maxInternalLinks,
            withMarkdown = false,
            contentChars = DEFAULT_CONTENT_CHARS
        } = options;

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

        const links = this.#harvestLinks($, url, maxExternalLinks, maxInternalLinks);

        // Markdown is rendered from the full document (minus noise) before we strip
        // it for the plaintext content slice, so links and structure survive.
        const markdown = withMarkdown ? this.#toMarkdown($) : undefined;

        $(NOISE_SELECTOR).remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const content = bodyText.slice(0, contentChars);

        return { url, title, description, keywords, content, markdown, metaData, links };
    }

    // Bias link harvesting toward EXTERNAL domains (the ones that grow coverage):
    // keep every external link up to the cap, but only a handful of internal ones.
    #harvestLinks($: CheerioAPI, url: string, maxExternal: number, maxInternal: number): string[]{
        const srcDomain = domainOf(url);
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

        return [...externals, ...internals];
    }

    // Prefer the main content region when the page marks one; fall back to <body>.
    #toMarkdown($: CheerioAPI): string{
        const region = $('main').first();
        const html = (region.length ? region : $('body')).html() ?? '';
        if(!html) return '';
        return turndown.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
    }
}
