import { getRedis } from '@/shared/redis/RedisClient';
import type { WorkspaceChange } from '@/modules/fleet/contracts/domain/events';

export default class WorkspaceFrontier{
    private static readonly CHANGES_MAX = 100;
    private static readonly WS_DOMAINS_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:domains`;
    private static readonly WS_FOLLOWEXT_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:followext`;
    private static readonly WS_CHANGES_KEY = (workspaceId: string) => `frontier:ws:${workspaceId}:changes`;

    async registerWorkspaceDomains(workspaceId: string, domains: string[]): Promise<void>{
        const clean = [...new Set(domains.filter(Boolean))];
        if(!clean.length) return;
        const redis = await getRedis();
        await redis.sAdd(WorkspaceFrontier.WS_DOMAINS_KEY(workspaceId), clean);
    }

    async getWorkspaceDomains(workspaceId: string): Promise<Set<string>>{
        const redis = await getRedis();
        return new Set(await redis.sMembers(WorkspaceFrontier.WS_DOMAINS_KEY(workspaceId)));
    }

    async setWorkspaceFollowExternal(workspaceId: string, on: boolean): Promise<void>{
        const redis = await getRedis();
        if(on) await redis.set(WorkspaceFrontier.WS_FOLLOWEXT_KEY(workspaceId), '1');
        else await redis.del(WorkspaceFrontier.WS_FOLLOWEXT_KEY(workspaceId));
    }

    async getWorkspaceFollowExternal(workspaceId: string): Promise<boolean>{
        const redis = await getRedis();
        return (await redis.exists(WorkspaceFrontier.WS_FOLLOWEXT_KEY(workspaceId))) === 1;
    }

    async recordChanges(workspaceId: string, urls: string[], now: number): Promise<void>{
        if(!urls.length) return;
        const redis = await getRedis();
        const multi = redis.multi();
        multi.lPush(WorkspaceFrontier.WS_CHANGES_KEY(workspaceId), urls.map((url) => JSON.stringify({ url, at: now })));
        multi.lTrim(WorkspaceFrontier.WS_CHANGES_KEY(workspaceId), 0, WorkspaceFrontier.CHANGES_MAX - 1);
        await multi.exec();
    }

    async getChanges(workspaceId: string, limit = WorkspaceFrontier.CHANGES_MAX): Promise<WorkspaceChange[]>{
        const redis = await getRedis();
        const raw = await redis.lRange(WorkspaceFrontier.WS_CHANGES_KEY(workspaceId), 0, limit - 1);
        const changes: WorkspaceChange[] = [];
        for(const value of raw){
            try{ changes.push(JSON.parse(value) as WorkspaceChange); }catch{ }
        }
        return changes;
    }
}
