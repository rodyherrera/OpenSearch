import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import JWTService from '../services/JWTService';

export const SocketAuthenticatedRoute: MiddlewareFn = (req) => {
    const token = tokenFromSubprotocol(req.headers['sec-websocket-protocol']) ?? tokenFromQuery(req.query);
    if(!token) throw new RuntimeError(AuthError.Unauthorized, 401);

    try{
        const { sub } = new JWTService().verify(token);
        req.principal = { userId: sub };
    }catch{
        throw new RuntimeError(AuthError.InvalidToken, 401);
    }
};

const tokenFromSubprotocol = (header: string | undefined): string | undefined => {
    const token = header?.split(',')[0]?.trim();
    return token || undefined;
};

const tokenFromQuery = (query: unknown): string | undefined => {
    const token = (query as { token?: string }).token?.trim();
    return token || undefined;
};
