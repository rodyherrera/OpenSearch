import { httpClient } from '@/shared/http/HttpClient';
import { logger } from '@/core/utils/Logger';

interface RobotsRules{
    disallow: string[];
    allow: string[];
    crawlDelayMs: number | null;
    fetchedAt: number;
}

const CACHE_TTL_MS = 1000 * 60 * 60;
const cache = new Map<string, RobotsRules>();

const USER_AGENT = 'CrawlmBot';

const parseRobots = (body: string): RobotsRules => {
    const lines = body.split(/\r?\n/);
    let appliesToUs = false;
    let appliesToWildcard = false;
    const ourRules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null, fetchedAt: Date.now() };
    const wildcardRules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null, fetchedAt: Date.now() };

    for(const rawLine of lines){
        const line = rawLine.split('#')[0].trim();
        if(!line) continue;
        const sepIndex = line.indexOf(':');
        if(sepIndex === -1) continue;
        const field = line.slice(0, sepIndex).trim().toLowerCase();
        const value = line.slice(sepIndex + 1).trim();

        if(field === 'user-agent'){
            const agent = value.toLowerCase();
            appliesToUs = agent === USER_AGENT.toLowerCase();
            appliesToWildcard = agent === '*';
            continue;
        }

        const target = appliesToUs ? ourRules : appliesToWildcard ? wildcardRules : null;
        if(!target) continue;

        if(field === 'disallow' && value) target.disallow.push(value);
        else if(field === 'allow' && value) target.allow.push(value);
        else if(field === 'crawl-delay'){
            const seconds = parseFloat(value);
            if(!Number.isNaN(seconds)) target.crawlDelayMs = seconds * 1000;
        }
    }

    return (ourRules.disallow.length || ourRules.allow.length || ourRules.crawlDelayMs !== null)
        ? ourRules
        : wildcardRules;
};

const getRules = async (origin: string): Promise<RobotsRules> => {
    const cached = cache.get(origin);
    if(cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) return cached;

    const empty: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null, fetchedAt: Date.now() };
    try{
        const { data } = await httpClient.get(`${origin}/robots.txt`, {
            timeout: 8000,
            responseType: 'text',
            validateStatus: (status) => status < 500
        });
        const rules = typeof data === 'string' && data.length ? parseRobots(data) : empty;
        cache.set(origin, rules);
        return rules;
    }catch(error){
        logger.debug(`robots.txt fetch failed for ${origin}: ${error}`);
        cache.set(origin, empty);
        return empty;
    }
};

export const isAllowed = async (url: string): Promise<boolean> => {
    try{
        const parsed = new URL(url);
        const origin = `${parsed.protocol}//${parsed.host}`;
        const rules = await getRules(origin);
        const path = parsed.pathname + parsed.search;

        const longest = (patterns: string[]): number => {
            let best = -1;
            for(const pattern of patterns){
                if(path.startsWith(pattern) && pattern.length > best){
                    best = pattern.length;
                }
            }
            return best;
        };

        const allowMatch = longest(rules.allow);
        const disallowMatch = longest(rules.disallow);
        if(disallowMatch > allowMatch) return false;
        return true;
    }catch{
        return true;
    }
};

export const crawlDelayFor = async (url: string): Promise<number | null> => {
    try{
        const parsed = new URL(url);
        const origin = `${parsed.protocol}//${parsed.host}`;
        const rules = await getRules(origin);
        return rules.crawlDelayMs;
    }catch{
        return null;
    }
};
