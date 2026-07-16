import type { Principal } from '@/modules/auth/contracts/domain/auth';

declare module 'fastify'{
    interface FastifyRequest{
        principal?: Principal;
        // Set by CurrentWorkspace: the active workspace resolved for this request.
        workspace?: { id: string };
    }
}
