import axios, { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import HtmlDataExtractor, { ScrapedAsset, ScrapedImage } from '@services/htmlDataExtractor';
import logger from '@utilities/logger';
import pLimit from 'p-limit';

/**
 * Interface que define la forma de los datos extraídos.
 */
interface ScrapedLinkData {
    title?: string;
    description?: string;
    url: string;
    metaData: Record<string, any>;
}

/**
 * Opciones de configuración para axios.
 */
const AXIOS_OPTS = {
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/58.0.3029.110 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
    },
    responseType: 'stream' as const,
    decompress: true,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 15000,
};

/**
 * Clase Web Scraper optimizada para manejar alta concurrencia.
 */
class WebScraper {
    private eventEmitter: EventEmitter;
    private concurrencyLimit: number;

    /**
     * Crea una instancia de WebScraper.
     * @param {EventEmitter} eventEmitter - Instancia de EventEmitter para emitir eventos.
     * @param {number} [concurrencyLimit=1000] - Límite de concurrencia para solicitudes.
     */
    constructor(eventEmitter: EventEmitter, concurrencyLimit = 1000) {
        this.eventEmitter = eventEmitter;
        this.concurrencyLimit = concurrencyLimit;
    }

    /**
     * Valida los datos extraídos.
     * @param {ScrapedLinkData} data - Los datos extraídos.
     * @returns {boolean} - True si los datos son válidos, false en caso contrario.
     */
    private static validateScrapedData(data: ScrapedLinkData): boolean {
        return Boolean(data.title && data.metaData?.description);
    }

    /**
     * Obtiene el contenido HTML de una página web.
     * @param {string} link - La URL de la página web.
     * @returns {Promise<string>} - Promesa que resuelve al contenido HTML.
     */
    async fetchHTML(link: string): Promise<string> {
        if(!link) return;
        try {
            const response: AxiosResponse = await axios.get(link, AXIOS_OPTS);
            const chunks: Buffer[] = [];
            return await new Promise<string>((resolve, reject) => {
                response.data.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });
                response.data.on('end', () => {
                    const data = Buffer.concat(chunks).toString('utf-8');
                    resolve(data);
                });
                response.data.on('error', (err: Error) => {
                    reject(err);
                });
            });
        } catch (error) {
            logger.error(`Failed to fetch HTML for ${link}: ${error}`);
            return '';
        }
    }

    /**
     * Extrae el contenido de un sitio web.
     * @param {string} url - La URL del sitio web.
     * @returns {Promise<string>} - Promesa que resuelve al contenido del sitio web.
     */
    async getWebsiteContent(url: string): Promise<string> {
        this.eventEmitter.emit('fetchingWebsiteContent', { url });
        const html = await this.fetchHTML(url);
        if (!html) return '';

        const dataExtractor = new HtmlDataExtractor(html, url, this.eventEmitter);
        this.eventEmitter.emit('fetchedWebsiteContent', { url, html });

        return dataExtractor.extractWebsiteContent();
    }

    /**
     * Extrae datos de una página web.
     * @param {string} html - El contenido HTML de la página web.
     * @param {string} url - La URL de la página web.
     * @returns {Promise<ScrapedLinkData>} - Promesa que resuelve a los datos extraídos.
     */
    async extractData(html: string, url: string): Promise<ScrapedLinkData> {
        if (!html) return { url, metaData: {} };

        this.eventEmitter.emit('fetchingWebsiteMetaData', { html, url });
        const dataExtractor = new HtmlDataExtractor(html, url, this.eventEmitter);
        const data: ScrapedLinkData = {
            title: dataExtractor.extractTitle(),
            description: dataExtractor.extractDescription(),
            metaData: dataExtractor.extractMetaData(),
            url,
        };
        this.eventEmitter.emit('fetchedWebsiteMetaData', { html, url, data });
        return data;
    }

    /**
     * Raspa un sitio web y extrae datos.
     * @param {string} url - La URL del sitio web.
     * @returns {Promise<ScrapedLinkData | null>} - Promesa que resuelve a los datos raspados o null.
     */
    async scrapeSite(url: string): Promise<ScrapedLinkData | null> {
        try {
            this.eventEmitter.emit('scrapingWebsite', { url });
            logger.debug(`@scrapeSite: Scraping ${url}`);
            const html = await this.fetchHTML(url);
            if (!html) return null;

            const startTime = Date.now();
            const data = await this.extractData(html, url);
            const elapsedTime = Date.now() - startTime;

            logger.debug(
                `@scrapeSite: OK ${url.slice(0, 30)}..., Elapsed Time ${elapsedTime} ms`
            );
            this.eventEmitter.emit('websiteScraped', { url, html, data });

            return WebScraper.validateScrapedData(data) ? data : null;
        } catch (error) {
            logger.error(`@scrapeSite error: ${error}`);
            return null;
        }
    }

    /**
     * Obtiene imágenes extraídas de múltiples sitios web.
     * @param {{ url: string }[]} websites - Un array de sitios web.
     * @returns {Promise<ScrapedImage[]>} - Promesa que resuelve a un array de imágenes extraídas.
     */
    async getExtractedImages(websites: { url: string }[]): Promise<ScrapedImage[]> {
        const limit = pLimit(this.concurrencyLimit);
        const extractedImagesArray = await Promise.all(
            websites.map(({ url }) =>
                limit(() => this.extractDataFromURL(url, extractor => extractor.extractAllImages()))
            )
        );
        return extractedImagesArray.flat();
    }

    /**
     * Obtiene assets extraídos de múltiples sitios web.
     * @param {{ url: string }[]} websites - Un array de sitios web.
     * @returns {Promise<ScrapedAsset[]>} - Promesa que resuelve a un array de assets extraídos.
     */
    async getExtractedAssets(websites: { url: string }[]): Promise<ScrapedAsset[]> {
        const limit = pLimit(this.concurrencyLimit);
        const extractedAssetsArray = await Promise.all(
            websites.map(({ url }) =>
                limit(() => this.extractDataFromURL(url, extractor => extractor.extractAssets()))
            )
        );
        return extractedAssetsArray.flat();
    }

    /**
     * Obtiene URLs extraídas de múltiples sitios web.
     * @param {{ url: string }[]} websites - Un array de sitios web.
     * @param {Object} opts - Opciones para la extracción de enlaces.
     * @param {boolean} opts.includeSameDomain - Incluir enlaces del mismo dominio.
     * @param {boolean} opts.restrictThirdPartyDomains - Restringir a dominios de terceros.
     * @returns {Promise<string[]>} - Promesa que resuelve a un array de URLs extraídas.
     */
    async getExtractedUrls(
        websites: { url: string }[],
        opts: { includeSameDomain: boolean; restrictThirdPartyDomains: boolean }
    ): Promise<string[]> {
        const limit = pLimit(this.concurrencyLimit);
        const extractedUrlsArray = await Promise.all(
            websites.map(({ url }) =>
                limit(() => this.extractDataFromURL(url, extractor => extractor.extractLinks(opts.includeSameDomain, opts.restrictThirdPartyDomains)))
            )
        );
        return extractedUrlsArray.flat();
    }

    /**
     * Raspa un array de sitios web y extrae datos.
     * @param {string[]} extractedUrls - Un array de URLs para raspar.
     * @returns {Promise<ScrapedLinkData[]>} - Promesa que resuelve a un array de datos raspados.
     */
    async getScrapedWebsites(extractedUrls: string[]): Promise<ScrapedLinkData[]> {
        const limit = pLimit(this.concurrencyLimit);
        const scrapedDataPromises = extractedUrls.map(url =>
            limit(() => this.scrapeSite(url))
        );
        const scrapedResults = await Promise.allSettled(scrapedDataPromises);
        const results: ScrapedLinkData[] = [];
        for (const result of scrapedResults) {
            if (result.status === 'fulfilled' && result.value) {
                results.push(result.value);
            }
        }
        return results;
    }

    /**
     * Extrae datos de una URL usando un método de extracción proporcionado.
     * @template T
     * @param {string} url - La URL de la cual extraer datos.
     * @param {(extractor: HtmlDataExtractor) => T} extractMethod - El método para extraer datos.
     * @returns {Promise<T>} - Promesa que resuelve al dato extraído.
     * @private
     */
    private async extractDataFromURL<T>(url: string, extractMethod: (extractor: HtmlDataExtractor) => T): Promise<T> {
        const html = await this.fetchHTML(url);
        if(!html){
            return '';
        }
        const dataExtractor = new HtmlDataExtractor(html, url, this.eventEmitter);
        return extractMethod(dataExtractor);
    }
}

export default WebScraper;
