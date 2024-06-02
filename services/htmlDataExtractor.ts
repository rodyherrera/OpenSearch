import { load } from 'cheerio';
import { normalizeUrl } from '@utilities/runtime';

/**
 * HTML Data Extractor Class.
*/
class HtmlDataExtractor{
    private $: any;
    private baseUrl: string;

    /**
     * Creates an instance of HtmlDataExtractor.
     * @param {string} html - The HTML string to be loaded.
    */
    constructor(html: string, baseUrl = ''){
        this.$ = load(html);
        this.baseUrl = baseUrl;
    };
    
    /**
     * Extracts the title from the HTML document.
     * @returns {string} The title text.
    */
    extractTitle(): string{
        return this.$('head > title').text().trim();
    };
    
    /**
     * Extracts the content of the body from the HTML document.
     * @returns {string} The text content of the body.
    */
    extractWebsiteContent(): string{
        return this.$('body').text();
    };

    /**
     * Extracts the meta description from the HTML document.
     * @returns {string | undefined} The meta description content if present.
    */
    extractDescription(): string | undefined{
        return this.$('meta[name="description"]').attr('content')?.trim();
    };

    extractAssets(): ScrapedAsset[]{
        const assets: ScrapedAsset[] = [];
        this.$('script').each((_: any, element: any) => {
            const src = this.$(element).attr('src') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc) return;
            assets.push({ type: 'script', url: normalizedSrc, parentUrl: this.baseUrl });
        });
        this.$('link[rel="stylesheet"]').each((_: any, element: any) => {
            const src = this.$(element).attr('href');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc) return;
            assets.push({ type: 'stylesheet', url: normalizedSrc, parentUrl: this.baseUrl });
        });
        this.$('link[rel="preload"]').each((_: any, element: any) => {
            const src = this.$(element).attr('href');
            const as = this.$(element).attr('as');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc || as !== 'font') return;
            assets.push({ type: 'font', url: normalizedSrc, parentUrl: this.baseUrl });
        });
        this.$('a').each((_: any, element: any) => {
            const src = this.$(element).attr('href');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc) return;
            const maybeExtension = src.match(/\.(pdf|doc|docx|xlsx|xls|ppt|pptx)$/i);
            if(!maybeExtension || !maybeExtension[0]) return;
            const extension = maybeExtension[0] as AssetTypes;
            assets.push({ type: extension, url: normalizedSrc, parentUrl: this.baseUrl });
        });
        return assets;
    };

    extractImages(): ScrapedImage[]{
        const images: ScrapedImage[] = [];
        this.$('img').each((_: any, element: any) => {
            const src = this.$(element).attr('src') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!normalizedSrc) return;
            const alt = this.$(element).attr('alt') || '';
            const width = this.$(element).attr('width');
            const height = this.$(element).attr('height');
            images.push({ src: normalizedSrc, width, height, alt });
        });
        this.$('picture source').each(async (_: any, element: any) => {
            const src = this.$(element).attr('srcset') || '';
            const normalizedSrc = normalizeUrl(src.split(' ')[0], this.baseUrl);
            if(!src || !normalizedSrc) return;
            const alt = this.$(element).attr('alt') || '';
            images.push({ src: normalizedSrc, alt });
        });
        this.$('meta[property="og:image"], meta[name="twitter:image"]').each(async (_: any, element: any) => {
            const src = this.$(element).attr('content') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc) return;
            images.push({ src: normalizedSrc, alt: '' });
        });
        return images;
    };

    /**
     * Extracts all meta data from the HTML document.
     * @returns {Object} An object containing all meta data key-value pairs.
    */
    extractMetaData(): { [key: string]: any } {
        const metaData: { [key: string]: any } = {};
        this.$('meta').each((_: any, element: any) => {
            const name = this.$(element).attr('name');
            const property = this.$(element).attr('property');
            const content = this.$(element).attr('content');
            if(!content) return;
            if(name){
                metaData[name] = content;
            }else if(property) {
                metaData[property] = content;
            }
        });
        return metaData;
    }

    /**
     * Extracts all links from the HTML document.
     * @returns {string[]} An array of URLs found in anchor tags.
    */
    extractLinks(): string[] {
        const links: string[] = [];
        this.$('a').each((_: any, element: any) => {
            const href = this.$(element).attr('href');
            if(href && (href.startsWith('http://') || href.startsWith('https://'))){
                links.push(href);
            }
        });
        return links;
    }
};

type AssetTypes = 'pdf' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'script' | 'stylesheet' | 'font';

export interface ScrapedAsset{
    type: AssetTypes,
    parentUrl: string,
    url: string
};

export interface ScrapedImage{
    alt: string;
    src: string;
    width?: number;
    height?: number;
};

export default HtmlDataExtractor;