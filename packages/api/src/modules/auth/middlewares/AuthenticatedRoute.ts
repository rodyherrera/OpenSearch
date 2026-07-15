import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import JWTService from '../services/JWTService';

export const AuthenticatedRoute: MiddlewareFn = (req) => {
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')){
        throw new RuntimeError(AuthError.Unauthorized, 401);
    }

    try{
        const { sub } = new JWTService().verify(header.slice(7).trim());
        req.principal = { userId: sub };
    }catch{
        throw new RuntimeError(AuthError.InvalidToken, 401);
    }
};
