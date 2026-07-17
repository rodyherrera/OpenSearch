import robotsParser from 'robots-parser';
import { fetchText, USER_AGENT } from '@/shared/http/HttpClient';

type Robot = ReturnType<typeof robotsParser>;

interface CachedRobots{
    robot: Robot;
    fetchedAt: number;
}

export default class RobotsGuard{
    private static readonly CACHE_TTL_MS = 1000 * 60 * 60;

    #cache = new Map<string, CachedRobots>();

    async isAllowed(url: string): Promise<boolean>{
        try{
            const origin = new URL(url).origin;
            const robot = await this.#rules(origin);
            return robot.isAllowed(url, USER_AGENT) !== false;
        }catch{
            return true;
        }
    }

    async #rules(origin: string): Promise<Robot>{
        const cached = this.#cache.get(origin);
        if(cached && (Date.now() - cached.fetchedAt) < RobotsGuard.CACHE_TTL_MS) return cached.robot;

        const robot = robotsParser(`${origin}/robots.txt`, await fetchText(`${origin}/robots.txt`, { timeoutMs: 8000 }));
        this.#cache.set(origin, { robot, fetchedAt: Date.now() });
        return robot;
    }
}
