import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Query, Param, Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import WebsiteSearchService from '@/modules/website/services/WebsiteSearchService';
import WebsiteService from '@/modules/website/services/WebsiteService';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

export default class WebsiteController extends BaseController{
    #search = new WebsiteSearchService();
    #service = new WebsiteService();

    @Route('/', 'GET')
    search(@Query() query: SearchQuery): Promise<PublicWebsite[]>{
        return this.#search.search(query);
    }

    @Route('/domains', 'GET')
    @Middleware(AuthenticatedRoute)
    async domains(){
        return { domains: await this.#service.listDomains() };
    }

    @Route('/:id', 'DELETE')
    @Status(204)
    @Middleware(AuthenticatedRoute)
    remove(@Param('id') id: string){
        return this.#service.deleteById(id).then(() => null);
    }

    @Route('/purge', 'POST')
    @Middleware(AuthenticatedRoute)
    purge(@Body() body: { domain?: string; all?: boolean }){
        return this.#service.purge(body).then((deleted) => ({ deleted }));
    }
}
