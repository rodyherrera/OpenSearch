import { getDomain } from 'tldts';

export default class UrlNormalizer{
    private static readonly MAX_PATH_SEGMENTS = 8;
    private static readonly MAX_QUERY_PARAMS = 4;
    private static readonly BINARY_EXT = /\.(png|jpe?g|gif|webp|svg|ico|bmp|tiff?|avif|mp4|webm|mkv|avi|mov|flv|wmv|mp3|wav|ogg|flac|aac|m4a|pdf|zip|rar|7z|tar|gz|bz2|xz|dmg|iso|exe|msi|deb|rpm|apk|woff2?|ttf|otf|eot|css|js|json|xml|rss|atom|doc|docx|xls|xlsx|ppt|pptx|psd|ai|epub|mobi)$/i;
    private static readonly TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref'];

    static normalizeUrl(raw: string): string | null{
        try{
            const url = new URL(raw);
            if(url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            if(UrlNormalizer.BINARY_EXT.test(url.pathname)) return null;
            if(url.pathname.split('/').filter(Boolean).length > UrlNormalizer.MAX_PATH_SEGMENTS) return null;
            url.hash = '';
            for(const param of UrlNormalizer.TRACKING_PARAMS) url.searchParams.delete(param);
            if(url.searchParams.size > UrlNormalizer.MAX_QUERY_PARAMS) return null;
            url.hostname = url.hostname.toLowerCase();
            if(url.pathname.length > 1 && url.pathname.endsWith('/')){
                url.pathname = url.pathname.slice(0, -1);
            }
            return url.toString();
        }catch{
            return null;
        }
    }

    static domainOf(url: string): string{
        return getDomain(url) ?? '';
    }
}
