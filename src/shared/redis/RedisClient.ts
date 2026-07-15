import { createClient, type RedisClientType } from 'redis';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

let client: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;

export const getRedis = async (): Promise<RedisClientType> => {
    if(client && client.isOpen) return client;
    client = createClient({ url: config.redis.uri });
    client.on('error', (error) => logger.error('Redis error', error, { scope: 'redis' }));
    await client.connect();
    logger.info('Connected to Redis', { scope: 'redis', uri: config.redis.uri });
    return client;
};

export const getRedisSubscriber = async (): Promise<RedisClientType> => {
    if(subscriber && subscriber.isOpen) return subscriber;
    const base = await getRedis();
    subscriber = base.duplicate();
    subscriber.on('error', (error) => logger.error('Redis subscriber error', error, { scope: 'redis' }));
    await subscriber.connect();
    return subscriber;
};

export const closeRedis = async (): Promise<void> => {
    if(subscriber && subscriber.isOpen){
        await subscriber.quit();
        subscriber = null;
    }
    if(client && client.isOpen){
        await client.quit();
        client = null;
    }
};
