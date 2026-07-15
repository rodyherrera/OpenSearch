import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import GraphService from '@/modules/graph/services/GraphService';

// Public read endpoint (like /website and /stats): the persisted domain graph the
// dashboard hydrates from on load, so the graph survives a full reload.
export default class GraphController extends BaseController{
    #service = new GraphService();

    @Route('/', 'GET')
    snapshot(){
        return this.#service.snapshot();
    }
}
