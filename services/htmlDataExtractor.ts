import { load, CheerioAPI } from 'cheerio';
import { normalizeUrl } from '@utilities/runtime';
import { EventEmitter } from 'events';

/**
 * Possible types of assets.
 */
type AssetTypes = 'pdf' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'script' | 'stylesheet' | 'font';

/**
 * Interface for representing a scraped asset.
 */
export interface ScrapedAsset {
    type: AssetTypes;
    parentUrl: string;
    url: string;
}

/**
 * Interface for representing a scraped image.
 */
export interface ScrapedImage {
    alt: string;
    src: string;
    width?: number;
    height?: number;
}

/**
 * Class for extracting data from an HTML document.
 */
class HtmlDataExtractor {
    private $: CheerioAPI;
    private baseUrl: string;
    private eventEmitter: EventEmitter;

    /**
     * Creates an instance of HtmlDataExtractor.
     * @param {string} html - The HTML string to be loaded.
     * @param {string} [baseUrl=''] - The base URL for normalizing relative URLs.
     */
    constructor(html: string, baseUrl = '', eventEmitter: EventEmitter) {
        this.$ = load(html);
        this.eventEmitter = eventEmitter;
        this.baseUrl = baseUrl;
    }

    /**
     * Extracts the title from the HTML document.
     * @returns {string} The title text.
     */
    extractTitle(): string {
        return this.$('head > title').text().trim();
    }

    /**
     * Extracts the content of the body from the HTML document.
     * @returns {string} The text content of the body.
     */
    extractWebsiteContent(): string {
        return this.$('body').text().trim();
    }

    /**
     * Extracts the meta description from the HTML document.
     * @returns {string | undefined} The meta description content if present.
     */
    extractDescription(): string | undefined {
        return this.$('meta[name="description"]').attr('content')?.trim();
    }

    /**
     * Extracts assets based on a CSS selector and mapping function.
     * @param {string} selector - The CSS selector to identify elements.
     * @param {(element: CheerioElement) => ScrapedAsset | null} mapFunction - The function to map elements to ScrapedAsset.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects.
     */
    private extractAssetsBySelector(
        selector: string,
        mapFunction: (element: CheerioElement) => ScrapedAsset | null
    ): ScrapedAsset[] {
        const elements = this.$(selector).toArray();
        const assets: ScrapedAsset[] = [];
        for (const element of elements) {
            const asset = mapFunction(element);
            if (asset) {
                assets.push(asset);
            }
        }
        return assets;
    }

    /**
     * Extracts the URLs of stylesheets from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the stylesheets.
     */
    extractStylesheetURLs(): ScrapedAsset[] {
        this.eventEmitter.emit('fetchingWebsiteAssets', { type: 'stylesheets', url: this.baseUrl });
        const assets = this.extractAssetsBySelector('link[rel="stylesheet"]', (element) => {
            const src = this.$(element).attr('href');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (src && normalizedSrc) {
                return { type: 'stylesheet', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
        this.eventEmitter.emit('fetchedWebsiteAssets', { type: 'stylesheets', url: this.baseUrl, assets });
        return assets;
    }

    /**
     * Extracts the URLs of scripts from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the scripts.
     */
    extractScriptsURLs(): ScrapedAsset[] {
        this.eventEmitter.emit('fetchingWebsiteAssets', { type: 'scripts', url: this.baseUrl });
        const assets = this.extractAssetsBySelector('script[src]', (element) => {
            const src = this.$(element).attr('src') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (src && normalizedSrc) {
                return { type: 'script', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
        this.eventEmitter.emit('fetchedWebsiteAssets', { type: 'scripts', url: this.baseUrl, assets });
        return assets;
    }

    /**
     * Extracts the URLs of fonts from the HTML document.
     * @returns {ScrapedAsset[]} - An array of ScrapedAsset objects representing the fonts.
     */
    extractFontURLs(): ScrapedAsset[] {
        this.eventEmitter.emit('fetchingWebsiteAssets', { type: 'fonts', url: this.baseUrl });
        const assets = this.extractAssetsBySelector('link[rel="preload"][as="font"]', (element) => {
            const src = this.$(element).attr('href');
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (src && normalizedSrc) {
                return { type: 'font', url: normalizedSrc, parentUrl: this.baseUrl };
            }
            return null;
        });
        this.eventEmitter.emit('fetchedWebsiteAssets', { type: 'fonts', url: this.baseUrl, assets });
        return assets;
    }

    /**
     * Extracts the URLs of files from the HTML document.
     * @returns {ScrapedAsset[]} - An array de ScrapedAsset objects representing los archivos.
     */
    extractFileURLs(): ScrapedAsset[] {
        this.eventEmitter.emit('fetchingWebsiteAssets', { type: 'files', url: this.baseUrl });
        const assets: ScrapedAsset[] = [];
        const fileExtensions = /\.(pdf|doc|docx|xlsx|xls|ppt|pptx)$/i;
        this.$('a[href]').each((_, element) => {
            const href = this.$(element).attr('href') || '';
            const normalizedHref = normalizeUrl(href, this.baseUrl);
            if (href && normalizedHref && fileExtensions.test(href)) {
                const match = href.match(fileExtensions);
                if (match && match[1]) {
                    assets.push({ type: match[1] as AssetTypes, url: normalizedHref, parentUrl: this.baseUrl });
                }
            }
        });
        this.eventEmitter.emit('fetchedWebsiteAssets', { type: 'files', url: this.baseUrl, assets });
        return assets;
    }

    /**
     * Extracts all assets from the HTML document.
     * @returns {ScrapedAsset[]} - An array de todos los ScrapedAsset objetos.
     */
    extractAssets(): ScrapedAsset[] {
        return [
            ...this.extractFileURLs(),
            ...this.extractFontURLs(),
            ...this.extractScriptsURLs(),
            ...this.extractStylesheetURLs(),
        ];
    }

    /**
     * Extracts images from the HTML document.
     * @returns {ScrapedImage[]} - An array de ScrapedImage objetos representando las imágenes.
     */
    extractImages(): ScrapedImage[] {
        const assets: ScrapedImage[] = [];
        this.$('img').each((_, element) => {
            const src = this.$(element).attr('src') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (!normalizedSrc) return;
            const alt = this.$(element).attr('alt') || '';
            const width = parseInt(this.$(element).attr('width') || '', 10) || undefined;
            const height = parseInt(this.$(element).attr('height') || '', 10) || undefined;
            assets.push({ src: normalizedSrc, alt, width, height });
        });
        return assets;
    }

    /**
     * Extracts pictures from the HTML document.
     * @returns {ScrapedImage[]} - An array de ScrapedImage objetos representando las imágenes de picture.
     */
    extractPictures(): ScrapedImage[] {
        const assets: ScrapedImage[] = [];
        this.$('picture source[srcset]').each((_, element) => {
            const srcset = this.$(element).attr('srcset') || '';
            const src = srcset.split(' ')[0];
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (!normalizedSrc) return;
            assets.push({ src: normalizedSrc, alt: '' });
        });
        return assets;
    }

    /**
     * Extracts images from meta tags in the HTML document.
     * @returns {ScrapedImage[]} - Un array de ScrapedImage objetos representando las imágenes de meta tags.
     */
    extractMetaTagsImages(): ScrapedImage[] {
        const assets: ScrapedImage[] = [];
        this.$('meta[property="og:image"], meta[name="twitter:image"]').each((_, element) => {
            const src = this.$(element).attr('content') || '';
            const normalizedSrc = normalizeUrl(src, this.baseUrl);
            if (!normalizedSrc) return;
            assets.push({ src: normalizedSrc, alt: '' });
        });
        return assets;
    }

    /**
     * Extracts all images from the HTML document.
     * @returns {ScrapedImage[]} - Un array de todos los ScrapedImage objetos.
     */
    extractAllImages(): ScrapedImage[] {
        this.eventEmitter.emit('fetchingWebsiteAssets', { type: 'images', url: this.baseUrl });
        const assets = [
            ...this.extractPictures(),
            ...this.extractMetaTagsImages(),
            ...this.extractImages(),
        ];
        this.eventEmitter.emit('fetchedWebsiteAssets', { type: 'images', url: this.baseUrl, assets });
        return assets;
    }

    /**
     * Extracts all meta data from the HTML document.
     * @returns {Record<string, any>} - Un objeto con todos los pares clave-valor de meta data.
     */
    extractMetaData(): Record<string, any> {
        const metaData: Record<string, any> = {};
        this.$('meta').each((_, element) => {
            const name = this.$(element).attr('name');
            const property = this.$(element).attr('property');
            const content = this.$(element).attr('content');
            if (!content) return;
            if (name) {
                metaData[name] = content;
            } else if (property) {
                metaData[property] = content;
            }
        });
        return metaData;
    }

    /**
     * Valida si una cadena es una URL válida.
     * @param {string} string - La cadena a validar.
     * @returns {boolean} - True si es una URL válida, false en caso contrario.
     */
    isValidUrl(string: string): boolean {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Extrae todos los enlaces del documento HTML.
     * @param {boolean} includeSameDomain - Incluir enlaces del mismo dominio.
     * @param {boolean} restrictThirdPartyDomains - Restringir a dominios de terceros.
     * @returns {string[]} - Un array de URLs encontradas en las etiquetas anchor.
     */
    extractLinks(includeSameDomain: boolean, restrictThirdPartyDomains: boolean): string[] {
        const links: string[] = [];
        this.eventEmitter.emit('fetchingWebsiteLinks', { url: this.baseUrl });
        let baseUrlDomain: string;
        try {
            baseUrlDomain = new URL(this.baseUrl).hostname;
        } catch {
            baseUrlDomain = '';
        }

        this.$('a[href]').each((_, element) => {
            const href = this.$(element).attr('href') || '';
            if (this.isValidUrl(href)) {
                const hrefDomain = new URL(href).hostname;
                const isSameDomain = hrefDomain === baseUrlDomain;
                if (
                    (!includeSameDomain && isSameDomain) ||
                    (restrictThirdPartyDomains && !isSameDomain)
                ) {
                    return;
                }
                links.push(href);
            }
        });
        this.eventEmitter.emit('fetchedWebsitesLinks', { url: this.baseUrl, links });
        return links;
    }
}

export default HtmlDataExtractor;
