import BaseController from '@/shared/controllers/BaseController';
import SuggestService from '@/modules/suggest/services/SuggestService';
import { Route } from '@/shared/controllers/Route';
import { Query } from '@/shared/controllers/RequestParams';
import type { SuggestQuery } from '@/modules/suggest/contracts/http/suggest';

export default class SuggestController extends BaseController{
    #service = new SuggestService();

    @Route('/', 'GET')
    search(@Query() query: SuggestQuery){
        return this.#service.search(query);
    }
}
