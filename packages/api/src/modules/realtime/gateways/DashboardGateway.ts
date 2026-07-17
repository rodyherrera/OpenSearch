import BaseGateway from '@/shared/gateways/BaseGateway';
import { Channel } from '@/shared/gateways/Channel';
import { OnMessage } from '@/shared/gateways/Gateway';
import { Socket, Payload, Principal } from '@/shared/gateways/GatewayParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { SocketAuthenticatedRoute } from '@/modules/auth/middlewares/SocketAuthenticatedRoute';
import RuntimeError from '@/shared/errors/RuntimeError';
import { AuthError } from '@/modules/auth/contracts/domain/errors';
import { WorkspaceError } from '@/modules/workspace/contracts/domain/workspace';
import AuthService from '@/modules/auth/services/AuthService';
import WorkspaceService from '@/modules/workspace/services/WorkspaceService';
import SnapshotService from '@/modules/stats/services/SnapshotService';
import WorkspaceSnapshotService from '@/modules/realtime/services/WorkspaceSnapshotService';
import CrawlRelayService from '@/modules/realtime/services/CrawlRelayService';
import type { GatewaySocket, InboundFrame } from '@/shared/contracts/gateway';
import type { RoutableEvent } from '@/modules/fleet/contracts/domain/events';
import type { Principal as PrincipalType } from '@/modules/auth/contracts/domain/auth';

@Channel('/ws')
@Middleware(SocketAuthenticatedRoute)
export default class DashboardGateway extends BaseGateway{
    #snapshots = new SnapshotService();
    #wsSnapshots = new WorkspaceSnapshotService();
    #relay = new CrawlRelayService();
    #workspaces = new WorkspaceService();
    #auth = new AuthService();
    #wsRoom = new WeakMap<GatewaySocket, string>();

    protected onRegister(): void{
        void this.#relay.start((raw) => this.#route(raw));
    }

    #route(raw: string): void{
        try{
            const event = JSON.parse(raw) as RoutableEvent;
            const room = event.workspaceId ? `ws:${event.workspaceId}` : 'ops';
            this.connections.sendRawToRoom(room, raw);
        }catch{ }
    }

    @OnMessage('subscribe')
    async subscribe(@Socket() socket: GatewaySocket, @Payload() frame: InboundFrame, @Principal() principal: PrincipalType | undefined): Promise<void>{
        const userId = principal?.userId;
        if(!userId) throw new RuntimeError(AuthError.Unauthorized, 401);

        if(frame.scope === 'ops'){
            if(!(await this.#auth.isAdmin(userId))) throw new RuntimeError(AuthError.Forbidden, 403);
            this.connections.join(socket, 'ops');
            socket.send(JSON.stringify(await this.#snapshots.build(Date.now())));
            return;
        }

        const workspaceId = String(frame.workspaceId ?? '');
        const member = await this.#workspaces.getIfMember(workspaceId, userId);
        if(!member) throw new RuntimeError(WorkspaceError.NotFound, 404);

        const prev = this.#wsRoom.get(socket);
        if(prev && prev !== `ws:${workspaceId}`) this.connections.leave(socket, prev);
        this.connections.join(socket, `ws:${workspaceId}`);
        this.#wsRoom.set(socket, `ws:${workspaceId}`);
        socket.send(JSON.stringify(await this.#wsSnapshots.build(workspaceId)));
    }
}
