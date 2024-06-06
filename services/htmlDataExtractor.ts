import { load } from 'cheerio';
import { normalizeUrl } from '@utilities/runtime';
import _ from 'lodash';

/**
 * Class for extracting data from an HTML document.
*/
class HtmlDataExtractor{
    private $: any;
    private baseUrl: string;

    /**
     * Creates an instance of HtmlDataExtractor.
     * @param {string} html - The HTML string to be loaded.
     * @param {string} [baseUrl=''] - The base URL for normalizing relative URLs.
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

    extractAssetsBySelector(selector: string, mapFunction: (element: any) => ScrapedAsset | null): ScrapedAsset[]{
        return _.compact(this.$(selector).map((_: any, element: any) => mapFunction(element)));
    };

    /**
     * Extracts the URLs of stylesheets from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the stylesheets.
    */
    extractStylesheetURLs(): ScrapedAsset[]{
        return this.extractAssetsBySelector('link[rel="stylesheet"]', (element) => {
            const src = this.$(element).attr('href');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(src && normalizedSrc){
                return { type: 'stylesheet', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
    };

    /**
     * Extracts the URLs of scripts from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the scripts.
    */
    extractScriptsURLs(): ScrapedAsset[]{
        return this.extractAssetsBySelector('script', (element) => {
            const src = this.$(element).attr('src') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(src && normalizedSrc){
                return { type: 'script', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
    };

    /**
     * Extracts the URLs of fonts from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the fonts.
    */
    extractFontURLs(): ScrapedAsset[]{
        return this.extractAssetsBySelector('link[rel="preload"]', (element) => {
            const src = this.$(element).attr('href');
            const as = this.$(element).attr('as');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(src && normalizedSrc && as === 'font'){
                return { type: 'font', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
    };

    /**
     * Extracts the URLs of files from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the files.
    */
    extractFileURLs(): ScrapedAsset[]{
        const assets: ScrapedAsset[] = [];
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

    /**
     * Extracts all assets from the HTML document.
     * @returns {ScrapedAsset[]} - An array of all ScrapedAsset objects.
    */
    extractAssets(): ScrapedAsset[]{
        return [
            ...this.extractFileURLs(),
            ...this.extractFontURLs(),
            ...this.extractScriptsURLs(),
            ...this.extractStylesheetURLs()
        ];
    };

    /**
     * Extracts images from the HTML document.
     * @returns {ScrapedImage[]} - An array of ScrapedImage objects representing the images.
    */
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
        return images;
    };

    /**
     * Extracts pictures from the HTML document.
     * @returns {ScrapedImage[]} - An array of ScrapedImage objects representing the pictures.
    */
    extractPictures(): ScrapedImage[]{
        const images: ScrapedImage[] = [];
        this.$('picture source').each(async (_: any, element: any) => {
            const src = this.$(element).attr('srcset') || '';
            const normalizedSrc = normalizeUrl(src.split(' ')[0], this.baseUrl);
            if(!src || !normalizedSrc) return;
            const alt = this.$(element).attr('alt') || '';
            images.push({ src: normalizedSrc, alt });
        });
        return images;
    };

    /**
     * Extracts images from meta tags in the HTML document.
     * @returns {ScrapedImage[]} - An array of ScrapedImage objects representing the images from meta tags.
    */
    extractMetaTagsImages(): ScrapedImage[]{
        const images: ScrapedImage[] = [];
        this.$('meta[property="og:image"], meta[name="twitter:image"]').each(async (_: any, element: any) => {
            const src = this.$(element).attr('content') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if(!src || !normalizedSrc) return;
            images.push({ src: normalizedSrc, alt: '' });
        });
        return images;
    };

    /**
     * Extracts all images from the HTML document.
     * @returns {ScrapedImage[]} - An array of all ScrapedImage objects.
    */
    exctractAllImages(): ScrapedImage[]{
        return [
            ...this.extractPictures(),
            ...this.extractMetaTagsImages(),
            ...this.extractImages()
        ];
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
        console.log('EL:', this.baseUrl, links.length);
        return links;
    }
};

/**
 * Possible types of assets.
*/
type AssetTypes = 'pdf' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'script' | 'stylesheet' | 'font';

/**
 * Interface for representing a scraped asset.
 * @interface
 * @property {AssetTypes} type - The type of the asset.
 * @property {string} parentUrl - The URL of the parent document.
 * @property {string} url - The URL of the asset.
*/
export interface ScrapedAsset{
    type: AssetTypes,
    parentUrl: string,
    url: string
};

/**
 * Interface for representing a scraped image.
 * @interface
 * @property {string} alt - The alternative text of the image (if available else '').
 * @property {string} src - The URL of the image.
 * @property {number | undefined} width - The width of the image (if available).
 * @property {number | undefined} height - The height of the image (if available).
*/
export interface ScrapedImage{
    alt: string;
    src: string;
    width?: number;
    height?: number;
};

export default HtmlDataExtractor;