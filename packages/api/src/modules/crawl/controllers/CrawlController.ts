import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Body, Param, Query } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { PublicApiRoute } from '@/modules/apikey/middlewares/PublicApiRoute';
import { CurrentPrincipal } from '@/modules/apikey/middlewares/CurrentPrincipal';
import CrawlJobService from '@/modules/crawl/services/CrawlJobService';
import type { Principal } from '@/modules/auth/contracts/domain/auth';
import type { CreateCrawlBody } from '@/modules/crawl/contracts/domain/crawl';

@Middleware(PublicApiRoute)
export default class CrawlController extends BaseController{
    #service = new CrawlJobService();

    @Route('/', 'POST')
    create(@Body() body: CreateCrawlBody, @CurrentPrincipal() principal: Principal){
        const owner = principal.apiKeyId ?? 'dashboard';
        return this.#service.create(body ?? {}, owner);
    }

    @Route('/:id', 'GET')
    status(@Param('id') id: string){
        return this.#service.getStatus(id);
    }

    @Route('/:id/results', 'GET')
    results(@Param('id') id: string, @Query('page') page?: string){
        return this.#service.getResults(id, page);
    }

    @Route('/:id/cancel', 'POST')
    cancel(@Param('id') id: string){
        return this.#service.cancel(id);
    }
}
