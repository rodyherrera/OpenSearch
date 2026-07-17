import { randomBytes, createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { config } from '@/shared/config';
import { getRedis } from '@/shared/redis/RedisClient';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import ApiKey from '@/modules/apikey/models/ApiKey';
import { ApiKeyError } from '@/modules/apikey/contracts/domain/errors';
import type { PublicApiKey, CreatedApiKey, VerifiedKey } from '@/modules/apikey/contracts/domain/apikey';

const KEY_PREFIX = 'os-';
const KEY_BYTES = 24;
const PREFIX_DISPLAY_CHARS = 6;
const TOUCH_TTL_S = 60;

const hashKey = (key: string): string => createHash('sha256').update(key).digest('hex');

export default class ApiKeyService{
    async create(name: string): Promise<CreatedApiKey>{
        const label = name?.trim() || 'Default';
        const secret = randomBytes(KEY_BYTES).toString('hex');
        const key = `${KEY_PREFIX}${secret}`;
        const doc = await ApiKey.create({
            name: label,
            keyHash: hashKey(key),
            prefix: `${KEY_PREFIX}${secret.slice(0, PREFIX_DISPLAY_CHARS)}`,
            last4: secret.slice(-4)
        });
        return { ...(doc.toJSON() as PublicApiKey), key };
    }

    async list(): Promise<PublicApiKey[]>{
        const docs = await ApiKey.find().sort({ createdAt: -1 });
        return docs.map((doc) => doc.toJSON() as PublicApiKey);
    }

    async revoke(id: string): Promise<boolean>{
        if(!mongoose.isValidObjectId(id)){
            throw new RuntimeError(RequestError.InvalidId, 400);
        }
        const doc = await ApiKey.findByIdAndDelete(id);
        return !!doc;
    }

    async verify(key: string): Promise<VerifiedKey>{
        const doc = await ApiKey.findOne({ keyHash: hashKey(key) }).select('_id');
        if(!doc) throw new RuntimeError(ApiKeyError.Invalid, 401);
        return { id: String(doc._id) };
    }

    async enforceRateLimit(keyId: string): Promise<void>{
        const redis = await getRedis();
        const windowKey = `ratelimit:apikey:${keyId}:${Math.floor(Date.now() / 60000)}`;
        const count = await redis.incr(windowKey);
        if(count === 1) await redis.expire(windowKey, 60);
        if(count > config.publicApi.rateLimitPerMin){
            throw new RuntimeError(ApiKeyError.RateLimited, 429);
        }
    }

    async recordUsage(keyId: string): Promise<void>{
        const redis = await getRedis();
        const day = new Date().toISOString().slice(0, 10);
        await Promise.all([
            redis.incr(`usage:apikey:${keyId}:total`),
            redis.incr(`usage:apikey:${keyId}:${day}`)
        ]);

        const touchKey = `usage:apikey:${keyId}:touched`;
        const firstInWindow = await redis.set(touchKey, '1', { NX: true, EX: TOUCH_TTL_S });
        if(firstInWindow === 'OK'){
            await ApiKey.updateOne({ _id: keyId }, { $set: { lastUsedAt: new Date() }, $inc: { requestCount: 1 } });
        }
    }
}
