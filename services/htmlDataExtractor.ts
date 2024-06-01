import { load } from 'cheerio';

/**
 * HTML Data Extractor Class.
*/
class HtmlDataExtractor{
    private $: any;

    /**
     * Creates an instance of HtmlDataExtractor.
     * @param {string} html - The HTML string to be loaded.
    */
    constructor(html: string){
        this.$ = load(html);
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

export default HtmlDataExtractor;