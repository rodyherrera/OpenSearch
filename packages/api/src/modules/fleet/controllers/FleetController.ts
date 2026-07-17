import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { AdminRoute } from '@/modules/auth/middlewares/AdminRoute';
import { getRedis } from '@/shared/redis/RedisClient';
import FleetControlService from '@/modules/fleet/services/FleetControlService';
import CrawlFrontier from '@/modules/fleet/services/CrawlFrontier';
import CrawlMetrics from '@/modules/fleet/services/CrawlMetrics';
import type { Tuning, ControlState } from '@/modules/fleet/contracts/domain/control';

const FRONTIER_COUNTER_KEYS = [
    'frontier:stored',
    'frontier:seen',
    'frontier:domains',
    'frontier:saturated',
    'frontier:rate',
    'frontier:domrate',
    'frontier:recent',
    'frontier:workers'
];

const FRONTIER_KEY_PATTERNS = ['frontier:dompages:*', 'frontier:cooldown:*'];

@Middleware(AuthenticatedRoute, AdminRoute)
export default class FleetController extends BaseController{
    #control = new FleetControlService();
    #frontier = new CrawlFrontier();
    #metrics = new CrawlMetrics();

    @Route('/status', 'GET')
    async status(){
        const now = Date.now();
        const [control, size, seen, domains, stored, perMin] = await Promise.all([
            this.#control.getControl(),
            this.#frontier.size(),
            this.#frontier.seenCount(),
            this.#frontier.domainCount(),
            this.#metrics.storedCount(),
            this.#metrics.storedPerMin(now)
        ]);
        return { ...control, frontier: { size, seen, domains, stored, perMin } };
    }

    @Route('/control', 'GET')
    getControl(): Promise<ControlState>{
        return this.#control.getControl();
    }

    @Route('/control', 'PATCH')
    async patch(@Body() body: Partial<Tuning> & { paused?: boolean }): Promise<ControlState>{
        const { paused, ...tuning } = body;
        if(paused !== undefined){
            await this.#control.setPaused(paused, Date.now());
        }
        await this.#control.patchTuning(tuning);
        return this.#control.getControl();
    }

    @Route('/pause', 'POST')
    async pause(){
        await this.#control.setPaused(true, Date.now());
        return { paused: true };
    }

    @Route('/resume', 'POST')
    async resume(){
        await this.#control.setPaused(false, Date.now());
        return { paused: false };
    }

    @Route('/reset', 'POST')
    async reset(){
        const redis = await getRedis();
        await redis.del(FRONTIER_COUNTER_KEYS);
        for(const pattern of FRONTIER_KEY_PATTERNS){
            const keys = await redis.keys(pattern);
            if(keys.length) await redis.del(keys);
        }
        return { cleared: true };
    }
}
