import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getChannel } from './Channel';
import { getGatewayHandlers } from './Gateway';
import { createContext } from './context';
import ConnectionRegistry from './ConnectionRegistry';
import { getParamResolvers } from '@/shared/controllers/params';
import { getClassMiddleware } from '@/shared/middlewares/Middleware';
import RuntimeError from '@/shared/errors/RuntimeError';
import { GatewayError } from '@/shared/errors/GatewayError';
import { ApiError } from '@/shared/contracts/http';
import { GatewaySocket, InboundFrame, OutboundMessage } from '@/shared/contracts/gateway';
import { logger } from '@/core/utils/Logger';

export default abstract class BaseGateway{
    protected readonly connections = new ConnectionRegistry();

    readonly #messageHandlers = new Map<string, string | symbol>();
    readonly #connectHandlers: Array<string | symbol> = [];
    readonly #disconnectHandlers: Array<string | symbol> = [];

    register(app: FastifyInstance): void{
        const path = getChannel(this.constructor);
        if(!path) throw new RuntimeError(GatewayError.MissingChannel, 500);

        this.#indexHandlers();
        const guards = getClassMiddleware(this.constructor);

        app.get(path, {
            websocket: true,
            preValidation: guards.map((mw) => async (req: FastifyRequest, reply: FastifyReply) => { await mw(req, reply); })
        }, (socket, req) => this.#onConnection(socket, req));

        this.onRegister();
    }

    protected onRegister(): void{}

    #indexHandlers(): void{
        for(const handler of getGatewayHandlers(this.constructor)){
            if(handler.kind === 'message') this.#messageHandlers.set(handler.type, handler.handlerName);
            else if(handler.kind === 'connect') this.#connectHandlers.push(handler.handlerName);
            else this.#disconnectHandlers.push(handler.handlerName);
        }
    }

    #onConnection(socket: GatewaySocket, req: FastifyRequest): void{
        this.connections.add(socket);
        for(const handlerName of this.#connectHandlers) void this.#runLifecycle(handlerName, socket, req);

        socket.on('message', (raw: Buffer) => void this.#dispatch(socket, req, raw.toString()));
        socket.on('close', () => {
            this.connections.remove(socket);
            for(const handlerName of this.#disconnectHandlers) void this.#runLifecycle(handlerName, socket, req);
        });
    }

    async #dispatch(socket: GatewaySocket, req: FastifyRequest, raw: string): Promise<void>{
        const frame = this.#parseFrame(raw);
        if(!frame){
            this.#sendError(socket, new RuntimeError(GatewayError.InvalidFrame, 400));
            return;
        }

        const handlerName = this.#messageHandlers.get(frame.type);
        if(handlerName === undefined){
            this.#sendError(socket, new RuntimeError(GatewayError.UnknownMessageType, 400));
            return;
        }

        try{
            const result = await this.#invoke(handlerName, socket, req, frame);
            if(result !== undefined && result !== null){
                this.#send(socket, { type: frame.type, data: result });
            }
        }catch(error){
            this.#handleError(socket, error);
        }
    }

    #parseFrame(raw: string): InboundFrame | undefined{
        try{
            const frame = JSON.parse(raw) as InboundFrame;
            return typeof frame?.type === 'string' ? frame : undefined;
        }catch{
            return undefined;
        }
    }

    async #runLifecycle(handlerName: string | symbol, socket: GatewaySocket, req: FastifyRequest): Promise<void>{
        try{
            await this.#invoke(handlerName, socket, req, undefined);
        }catch(error){
            this.#handleError(socket, error);
        }
    }

    async #invoke(handlerName: string | symbol, socket: GatewaySocket, req: FastifyRequest, frame: InboundFrame | undefined): Promise<unknown>{
        const ctx = createContext(req, socket, frame);
        const resolvers = getParamResolvers(this.constructor, handlerName);
        const args = await Promise.all(resolvers.map((resolve) => resolve(ctx)));

        const methods = this as unknown as Record<string | symbol, (...args: unknown[]) => unknown>;
        return methods[handlerName].apply(this, args);
    }

    #handleError(socket: GatewaySocket, error: unknown): void{
        if(error instanceof RuntimeError){
            this.#sendError(socket, error);
            return;
        }

        logger.error('gateway handler failed', error, { scope: 'ws' });
        this.#sendError(socket, new RuntimeError(GatewayError.Internal, 500));
    }

    #send(socket: GatewaySocket, message: OutboundMessage<unknown>): void{
        socket.send(JSON.stringify(message));
    }

    #sendError(socket: GatewaySocket, error: RuntimeError): void{
        socket.send(JSON.stringify({ error: error.message } satisfies ApiError));
    }
}
