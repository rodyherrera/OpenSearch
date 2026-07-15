import type { WebSocket } from '@fastify/websocket';

export type GatewaySocket = WebSocket;

export interface InboundFrame{
    type: string;
    [field: string]: unknown;
}

export interface OutboundMessage<T>{
    type: string;
    data: T;
}

export type GatewayLifecycle = 'connect' | 'disconnect';

interface MessageHandler{
    kind: 'message';
    type: string;
    handlerName: string | symbol;
}

interface LifecycleHandler{
    kind: GatewayLifecycle;
    handlerName: string | symbol;
}

export type GatewayHandler = MessageHandler | LifecycleHandler;
