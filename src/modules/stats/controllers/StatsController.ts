import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import SnapshotService from '@/modules/stats/services/SnapshotService';
import type { Snapshot } from '@/modules/stats/contracts/domain/snapshot';

export default class StatsController extends BaseController{
    #snapshots = new SnapshotService();

    @Route('/', 'GET')
    snapshot(): Promise<Snapshot>{
        return this.#snapshots.build(Date.now());
    }
}
