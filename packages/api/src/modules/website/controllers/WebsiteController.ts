import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Query, Param, Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentWorkspace, CurrentWorkspaceId } from '@/modules/workspace/middlewares/CurrentWorkspace';
import WorkspaceService from '@/modules/workspace/services/WorkspaceService';
import WebsiteSearchService from '@/modules/website/services/WebsiteSearchService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

// A dashboard listing can look at just the active workspace's slice of the index
// or at the whole shared corpus. Everything defaults to the workspace scope.
type Scope = 'workspace' | 'global';

@Middleware(AuthenticatedRoute, CurrentWorkspace)
export default class WebsiteController extends BaseController{
    #search = new WebsiteSearchService();
    #service = new WebsiteService();
    #workspaces = new WorkspaceService();

    // Resolve the domain filter for a request: the workspace's seeded domains, or
    // undefined for global scope (no filter).
    async #scopeDomains(workspaceId: string, scope?: string): Promise<string[] | undefined>{
        if((scope as Scope) === 'global') return undefined;
        return this.#workspaces.seedDomains(workspaceId);
    }

    @Route('/', 'GET')
    async search(@CurrentWorkspaceId() workspaceId: string, @Query() query: SearchQuery & { scope?: string }): Promise<PublicWebsite[]>{
        const domains = await this.#scopeDomains(workspaceId, query.scope);
        return this.#search.search(query, domains);
    }

    @Route('/domains', 'GET')
    async domains(@CurrentWorkspaceId() workspaceId: string, @Query('scope') scope?: string){
        const domains = await this.#scopeDomains(workspaceId, scope);
        return { domains: await this.#service.listDomains(1000, domains) };
    }

    @Route('/:id', 'DELETE')
    @Status(204)
    remove(@Param('id') id: string){
        return this.#service.deleteById(id).then(() => null);
    }

    @Route('/purge', 'POST')
    purge(@Body() body: { domain?: string; all?: boolean }){
        return this.#service.purge(body).then((deleted) => ({ deleted }));
    }
}
