import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnConnect } from '@/shared/gateways/Gateway';
import { Socket } from '@/shared/gateways/GatewayParams';
import type { GatewaySocket } from '@/shared/contracts/gateway';
import SnapshotService from '@/modules/stats/services/SnapshotService';
import CrawlRelayService from '@/modules/realtime/services/CrawlRelayService';

@Channel('/ws')
export default class DashboardGateway extends BaseGateway{
    #snapshots = new SnapshotService();
    #relay = new CrawlRelayService();

    protected onRegister(): void{
        void this.#relay.start((raw) => this.connections.broadcastRaw(raw));
    }

    @OnConnect()
    async onConnect(@Socket() socket: GatewaySocket): Promise<void>{
        const snapshot = await this.#snapshots.build(Date.now());
        socket.send(JSON.stringify(snapshot));
    }
}
