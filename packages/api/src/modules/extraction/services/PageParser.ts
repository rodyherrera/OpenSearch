import { load, type CheerioAPI } from 'cheerio';
import TurndownService from 'turndown';
import { config } from '@/shared/config';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import type { ParsedPage, ParseOptions } from '@/modules/extraction/contracts/domain/extraction';

export default class PageParser{
    private static readonly DEFAULT_CONTENT_CHARS = 2000;
    private static readonly NOISE_SELECTOR = 'script, style, noscript, svg, nav, footer, header, form, iframe';

    #turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
    });

    constructor(){
        this.#turndown.remove(['script', 'style', 'noscript', 'iframe', 'form']);
    }

    parse(html: string, url: string, options: ParseOptions = {}): ParsedPage{
        const {
            maxExternalLinks = config.crawler.maxLinksPerPage,
            maxInternalLinks = config.crawler.maxInternalLinks,
            withMarkdown = false,
            contentChars = PageParser.DEFAULT_CONTENT_CHARS
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
        const markdown = withMarkdown ? this.#toMarkdown($) : undefined;

        $(PageParser.NOISE_SELECTOR).remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        const content = bodyText.slice(0, contentChars);

        return { url, title, description, keywords, content, markdown, metaData, links };
    }

    #harvestLinks($: CheerioAPI, url: string, maxExternal: number, maxInternal: number): string[]{
        const srcDomain = UrlNormalizer.domainOf(url);
        const externals: string[] = [];
        const internals: string[] = [];
        const seen = new Set<string>();

        $('a[href]').each((_, el) => {
            if(externals.length >= maxExternal && internals.length >= maxInternal) return;
            const href = $(el).attr('href');
            if(!href) return;
            try{
                const normalized = UrlNormalizer.normalizeUrl(new URL(href, url).toString());
                if(!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                const linkDomain = UrlNormalizer.domainOf(normalized);
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
        
    #toMarkdown($: CheerioAPI): string{
        const region = $('main').first();
        const html = (region.length ? region : $('body')).html() ?? '';
        if(!html) return '';
        return this.#turndown.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
    }
}
