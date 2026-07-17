import CrawlFrontier from '@/modules/crawler/services/CrawlFrontier';
import WorkspaceFrontier from '@/modules/crawler/services/WorkspaceFrontier';
import UrlNormalizer from '@/modules/crawler/services/UrlNormalizer';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { ParsedPage } from '@/modules/extraction/contracts/domain/extraction';

export default class LinkRouter{
    #frontier: CrawlFrontier;
    #workspaces: WorkspaceFrontier;
    #websites: WebsiteService;

    constructor(frontier: CrawlFrontier, workspaces: WorkspaceFrontier, websites: WebsiteService){
        this.#frontier = frontier;
        this.#workspaces = workspaces;
        this.#websites = websites;
    }

    async route(records: ParsedPage[], workspaceByUrl: Map<string, string | null>): Promise<number>{
        const origins = [...new Set([...workspaceByUrl.values()].filter((id): id is string => Boolean(id)))];
        const domainsByWorkspace = new Map<string, Set<string>>();
        const followExternalByWorkspace = new Map<string, boolean>();
        await Promise.all(origins.map(async (id) => {
            const [domains, followExternal] = await Promise.all([
                this.#workspaces.getWorkspaceDomains(id),
                this.#workspaces.getWorkspaceFollowExternal(id)
            ]);
            domainsByWorkspace.set(id, domains);
            followExternalByWorkspace.set(id, followExternal);
        }));

        const globalLinks: string[] = [];
        const scopedLinks = new Map<string, string[]>();
        const externalLinks = new Map<string, string[]>();
        const push = (map: Map<string, string[]>, workspaceId: string, link: string) => {
            const bucket = map.get(workspaceId) ?? [];
            bucket.push(link);
            map.set(workspaceId, bucket);
        };

        for(const record of records){
            const workspaceId = workspaceByUrl.get(record.url) ?? null;
            const domains = workspaceId ? domainsByWorkspace.get(workspaceId) : undefined;
            const onSeedDomain = Boolean(domains?.has(UrlNormalizer.domainOf(record.url)));
            const followExternal = workspaceId ? Boolean(followExternalByWorkspace.get(workspaceId)) : false;

            for(const link of record.links){
                if(workspaceId && domains?.has(UrlNormalizer.domainOf(link))){
                    push(scopedLinks, workspaceId, link);
                }else if(workspaceId && followExternal && onSeedDomain){
                    push(externalLinks, workspaceId, link);
                }else{
                    globalLinks.push(link);
                }
            }
        }

        let added = await this.#frontier.enqueue(globalLinks);
        for(const [workspaceId, links] of scopedLinks){
            added += await this.#frontier.enqueueScoped(links, workspaceId);
        }
        for(const [workspaceId, links] of externalLinks){
            added += await this.#frontier.enqueue(links, workspaceId);
            void this.#websites.stampWorkspaceByUrls(links, workspaceId);
        }
        return added;
    }
}
