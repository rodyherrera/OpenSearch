import WorkspaceFrontier from '@/modules/crawler/services/WorkspaceFrontier';
import CrawlEventPublisher from '@/modules/crawler/services/CrawlEventPublisher';
import UrlNormalizer from '@/modules/crawler/services/UrlNormalizer';
import type { ParsedPage } from '@/modules/extraction/contracts/domain/extraction';
import type { WorkspacePageRow } from '@/modules/crawler/contracts/domain/events';

export default class WorkspaceNotifier{
    #workspaces: WorkspaceFrontier;
    #publisher = new CrawlEventPublisher();

    constructor(workspaces: WorkspaceFrontier){
        this.#workspaces = workspaces;
    }

    async notifyIndexed(inserted: string[], records: ParsedPage[], workspaceByUrl: Map<string, string | null>, now: number): Promise<void>{
        const recordByUrl = new Map(records.map((record) => [record.url, record]));
        const byWorkspace = new Map<string, WorkspacePageRow[]>();
        for(const url of inserted){
            const workspaceId = workspaceByUrl.get(url);
            const record = recordByUrl.get(url);
            if(!workspaceId || !record) continue;
            const bucket = byWorkspace.get(workspaceId) ?? [];
            bucket.push({ url, title: record.title, domain: UrlNormalizer.domainOf(url), at: now });
            byWorkspace.set(workspaceId, bucket);
        }
        for(const [workspaceId, pages] of byWorkspace){
            await this.#publisher.publishWorkspacePages(workspaceId, pages, now);
        }
    }

    async notifyChanges(changed: string[], workspaceByUrl: Map<string, string | null>, now: number): Promise<void>{
        const byWorkspace = new Map<string, string[]>();
        for(const url of changed){
            const workspaceId = workspaceByUrl.get(url);
            if(!workspaceId) continue;
            const bucket = byWorkspace.get(workspaceId) ?? [];
            bucket.push(url);
            byWorkspace.set(workspaceId, bucket);
        }
        for(const [workspaceId, urls] of byWorkspace){
            await this.#workspaces.recordChanges(workspaceId, urls, now);
            await this.#publisher.publishChangeEvent(workspaceId, urls, now);
        }
    }
}
