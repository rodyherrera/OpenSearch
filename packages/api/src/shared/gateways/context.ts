import type { FastifyRequest } from 'fastify';
import type { GatewaySocket, InboundFrame } from '@/shared/contracts/gateway';

export const SOCKET = Symbol('gateway.socket');
export const PAYLOAD = Symbol('gateway.payload');

export interface GatewayContext extends FastifyRequest{
    [SOCKET]: GatewaySocket;
    [PAYLOAD]: InboundFrame | undefined;
}

export const createContext = (
    req: FastifyRequest,
    socket: GatewaySocket,
    payload: InboundFrame | undefined
): GatewayContext => {
    const ctx = Object.create(req) as GatewayContext;
    ctx[SOCKET] = socket;
    ctx[PAYLOAD] = payload;
    return ctx;
};
