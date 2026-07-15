import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyBaseLogger } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { config } from '@/shared/config';
import Bootstrap from '@/core/Bootstrap';
import ModuleDiscovery, { type MountedController } from '@/core/modules/discovery';
import { logger } from '@/core/utils/Logger';
import RuntimeError from '@/shared/errors/RuntimeError';
import { ApiError } from '@/shared/contracts/http';
import type BaseGateway from '@/shared/gateways/BaseGateway';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export default class HttpApplication{
    #app!: FastifyInstance;
    #bootstrap = new Bootstrap();

    async start(): Promise<void>{
        await this.#bootstrap.initInfra();

        this.#app = Fastify({
            loggerInstance: logger.raw as FastifyBaseLogger,
            disableRequestLogging: true
        });

        await this.#app.register(cors, {
            origin: config.corsOrigin,
            credentials: true
        });
        await this.#app.register(websocket);
        await this.#app.register(fastifyStatic, { root: PUBLIC_DIR });

        const { controllers, gateways } = await new ModuleDiscovery().discover();

        this.#registerErrorHandler();
        this.#registerRequestLogging();
        await this.#mountControllers(controllers);
        this.#mountGateways(gateways);

        await this.#app.listen({ port: config.server.port, host: config.server.host });
    }

    async stop(): Promise<void>{
        await this.#app.close();
        await this.#bootstrap.shutdown();
    }

    #registerErrorHandler(): void{
        this.#app.setErrorHandler((err, req, reply) => {
            const status = err instanceof RuntimeError ? err.statusCode : 500;
            const message = err instanceof Error ? err.message : 'Internal Server Error';

            if(status >= 500){
                logger.error(`${req.method} ${req.url}`, err, { scope: 'http', statusCode: status });
            }

            reply.status(status).send({ error: message } satisfies ApiError);
        });
    }

    #registerRequestLogging(): void{
        this.#app.addHook('onResponse', (req, reply, done) => {
            logger.debug(`${req.method} ${req.url}`, {
                scope: 'http',
                statusCode: reply.statusCode,
                ms: Math.round(reply.elapsedTime)
            });
            done();
        });
    }

    async #mountControllers(controllers: MountedController[]): Promise<void>{
        for(const { prefix, Controller } of controllers){
            await new Controller().register(this.#app, config.apiPrefix + prefix);
        }
    }

    #mountGateways(gateways: Array<new () => BaseGateway>): void{
        for(const Gateway of gateways){
            new Gateway().register(this.#app);
        }
    }
}
