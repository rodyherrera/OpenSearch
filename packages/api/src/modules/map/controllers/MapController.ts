import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Body } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { PublicApiRoute } from '@/modules/apikey/middlewares/PublicApiRoute';
import MapService from '@/modules/map/services/MapService';
import type { MapBody } from '@/modules/map/contracts/domain/map';

// Public developer API: POST /map — enumerate a site's URLs from its sitemap, its
// homepage links, and everything already in the crawled index.
@Middleware(PublicApiRoute)
export default class MapController extends BaseController{
    #service = new MapService();

    @Route('/', 'POST')
    map(@Body() body: MapBody){
        return this.#service.map(body ?? {});
    }
}
