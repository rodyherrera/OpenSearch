import type { Principal } from '@/modules/auth/contracts/domain/auth';

declare module 'fastify'{
    interface FastifyRequest{
        principal?: Principal;
    }
}
