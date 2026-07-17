import WorkspaceFrontier from '@/modules/crawler/services/WorkspaceFrontier';
import WebsiteService from '@/modules/website/services/WebsiteService';
import SeedService from '@/modules/seed/services/SeedService';
import type { WorkspaceSnapshot } from '@/modules/realtime/contracts/domain/snapshot';

const RECENT = 50;
const SEED_LIMIT = 200;

export default class WorkspaceSnapshotService{
    #workspaceFrontier = new WorkspaceFrontier();
    #websites = new WebsiteService();
    #seeds = new SeedService();

    async build(workspaceId: string): Promise<WorkspaceSnapshot>{
        const [domains, recentPages, seeds, changes] = await Promise.all([
            this.#websites.listDomains(1000, workspaceId).catch(() => []),
            this.#websites.listRecent(RECENT, workspaceId).catch(() => []),
            this.#seeds.list(workspaceId, 1, SEED_LIMIT).catch(() => []),
            this.#workspaceFrontier.getChanges(workspaceId).catch(() => [])
        ]);

        const pages = domains.reduce((sum, entry) => sum + entry.pages, 0);
        return {
            type: 'ws:snapshot',
            workspaceId,
            ts: Date.now(),
            counts: { pages, domains: domains.length, changes: changes.length },
            recentPages,
            domains,
            seeds,
            changes
        };
    }
}
