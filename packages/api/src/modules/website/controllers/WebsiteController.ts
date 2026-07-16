import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Query, Param, Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentWorkspace, CurrentWorkspaceId } from '@/modules/workspace/middlewares/CurrentWorkspace';
import WebsiteSearchService from '@/modules/website/services/WebsiteSearchService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

type Scope = 'workspace' | 'global';

@Middleware(AuthenticatedRoute, CurrentWorkspace)
export default class WebsiteController extends BaseController{
    #search = new WebsiteSearchService();
    #service = new WebsiteService();

    #scope(workspaceId: string, scope?: string): string | undefined{
        return (scope as Scope) === 'global' ? undefined : workspaceId;
    }

    @Route('/', 'GET')
    async search(@CurrentWorkspaceId() workspaceId: string, @Query() query: SearchQuery & { scope?: string }): Promise<PublicWebsite[]>{
        return this.#search.search(query, this.#scope(workspaceId, query.scope));
    }

    @Route('/domains', 'GET')
    async domains(@CurrentWorkspaceId() workspaceId: string, @Query('scope') scope?: string){
        return { domains: await this.#service.listDomains(1000, this.#scope(workspaceId, scope)) };
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
