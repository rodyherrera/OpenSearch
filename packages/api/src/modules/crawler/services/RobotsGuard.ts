import robotsParser from 'robots-parser';
import { httpClient } from '@/shared/http/HttpClient';
import { logger } from '@/core/utils/Logger';

type Robot = ReturnType<typeof robotsParser>;

interface CachedRobots{
    robot: Robot;
    fetchedAt: number;
}

export default class RobotsGuard{
    private static readonly USER_AGENT = 'CrawlmBot';
    private static readonly CACHE_TTL_MS = 1000 * 60 * 60;

    #cache = new Map<string, CachedRobots>();

    async isAllowed(url: string): Promise<boolean>{
        try{
            const origin = new URL(url).origin;
            const robot = await this.#rules(origin);
            return robot.isAllowed(url, RobotsGuard.USER_AGENT) !== false;
        }catch{
            return true;
        }
    }

    async #rules(origin: string): Promise<Robot>{
        const cached = this.#cache.get(origin);
        if(cached && (Date.now() - cached.fetchedAt) < RobotsGuard.CACHE_TTL_MS) return cached.robot;

        let body = '';
        try{
            const { data } = await httpClient.get(`${origin}/robots.txt`, {
                timeout: 8000,
                responseType: 'text',
                validateStatus: (status) => status < 500
            });
            if(typeof data === 'string') body = data;
        }catch(error){
            logger.debug(`robots.txt fetch failed for ${origin}: ${error}`);
        }

        const robot = robotsParser(`${origin}/robots.txt`, body);
        this.#cache.set(origin, { robot, fetchedAt: Date.now() });
        return robot;
    }
}
