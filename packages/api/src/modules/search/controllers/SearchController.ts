import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Query } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { PublicApiRoute } from '@/modules/apikey/middlewares/PublicApiRoute';
import PublicSearchService from '@/modules/search/services/PublicSearchService';
import type { SearchParams } from '@/modules/search/contracts/domain/search';

@Middleware(PublicApiRoute)
export default class SearchController extends BaseController{
    #service = new PublicSearchService();

    @Route('/', 'GET')
    search(@Query() params: SearchParams){
        return this.#service.search(params);
    }
}
