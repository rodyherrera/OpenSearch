import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Body } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { PublicApiRoute } from '@/modules/apikey/middlewares/PublicApiRoute';
import ScrapeService from '@/modules/scrape/services/ScrapeService';
import type { ScrapeBody } from '@/modules/scrape/contracts/domain/scrape';

// Public developer API: POST /scrape — fetch one URL as clean markdown + metadata,
// served from the crawled index when a fresh copy exists.
@Middleware(PublicApiRoute)
export default class ScrapeController extends BaseController{
    #service = new ScrapeService();

    @Route('/', 'POST')
    scrape(@Body() body: ScrapeBody){
        return this.#service.scrape(body ?? {});
    }
}
