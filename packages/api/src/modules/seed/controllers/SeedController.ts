import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Status } from '@/shared/controllers/Status';
import { Middleware } from '@/shared/middlewares/Middleware';
import { Query, Param, Body } from '@/shared/controllers/RequestParams';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import SeedService from '@/modules/seed/services/SeedService';
import type { PublicSeed, AddSeedsBody, AddSeedsResult } from '@/modules/seed/contracts/domain/seed';

@Middleware(AuthenticatedRoute)
export default class SeedController extends BaseController{
    #service = new SeedService();

    @Route('/', 'GET')
    list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('q') q?: string): Promise<PublicSeed[]>{
        return this.#service.list(Number(page), Number(limit), q);
    }

    @Route('/', 'POST')
    add(@Body() body: AddSeedsBody): Promise<AddSeedsResult>{
        return this.#service.add(body?.urls ?? []);
    }

    @Route('/:id', 'DELETE')
    @Status(204)
    remove(@Param('id') id: string){
        return this.#service.deleteById(id).then(() => null);
    }
}
