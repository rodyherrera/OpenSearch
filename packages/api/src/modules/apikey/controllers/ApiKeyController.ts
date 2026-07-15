import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Body, Param } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import ApiKeyService from '@/modules/apikey/services/ApiKeyService';

// Dashboard-only management of developer API keys — always behind the admin JWT.
// The keys minted here authenticate the public /search, /scrape, /map, /crawl API.
@Middleware(AuthenticatedRoute)
export default class ApiKeyController extends BaseController{
    #service = new ApiKeyService();

    @Route('/', 'GET')
    list(){
        return this.#service.list();
    }

    @Route('/', 'POST')
    create(@Body() body: { name?: string }){
        return this.#service.create(body?.name ?? '');
    }

    @Route('/:id', 'DELETE')
    @Status(204)
    remove(@Param('id') id: string){
        return this.#service.revoke(id).then(() => null);
    }
}
