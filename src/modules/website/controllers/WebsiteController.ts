import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Query } from '@/shared/controllers/RequestParams';
import WebsiteSearchService from '@/modules/website/services/WebsiteSearchService';
import type { SearchQuery } from '@/modules/website/contracts/http/search';
import type { PublicWebsite } from '@/modules/website/contracts/domain/website';

export default class WebsiteController extends BaseController{
    #search = new WebsiteSearchService();

    @Route('/', 'GET')
    search(@Query() query: SearchQuery): Promise<PublicWebsite[]>{
        return this.#search.search(query);
    }
}
