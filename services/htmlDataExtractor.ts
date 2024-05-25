import { load } from 'cheerio';

class HtmlDataExtractor{
    private $: any;

    constructor(html: string){
        this.$ = load(html);
    };
    
    extractTitle(): string{
        return this.$('head > title').text().trim();
    }

    extractDescription(): string | undefined{
        return this.$('meta[name="description"]').attr('content')?.trim();
    };

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