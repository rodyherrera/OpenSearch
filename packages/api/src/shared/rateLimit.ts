import { getRedis } from '@/shared/redis/RedisClient';
import RuntimeError from '@/shared/errors/RuntimeError';

// Fixed-window limiter: one counter per (scope, id) per window. First hit sets the
// expiry; going over the ceiling throws with the given error message.
export const enforceRateLimit = async (
    scope: string,
    id: string,
    limit: number,
    error: string,
    windowSec = 60
): Promise<void> => {
    const redis = await getRedis();
    const windowKey = `ratelimit:${scope}:${id}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const count = await redis.incr(windowKey);
    if(count === 1) await redis.expire(windowKey, windowSec);
    if(count > limit){
        throw new RuntimeError(error, 429);
    }
};
