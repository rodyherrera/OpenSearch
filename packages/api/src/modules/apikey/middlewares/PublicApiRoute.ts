import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '@/modules/auth/contracts/domain/errors';
import JWTService from '@/modules/auth/services/JWTService';
import ApiKeyService from '@/modules/apikey/services/ApiKeyService';

const jwt = new JWTService();
const keys = new ApiKeyService();

export const PublicApiRoute: MiddlewareFn = async (req) => {
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')){
        throw new RuntimeError(AuthError.Unauthorized, 401);
    }
    const token = header.slice(7).trim();

    if(token.startsWith('os-')){
        const key = await keys.verify(token);
        await keys.enforceRateLimit(key.id);
        void keys.recordUsage(key.id);
        req.principal = { userId: key.id, apiKeyId: key.id };
        return;
    }

    try{
        const { sub } = jwt.verify(token);
        req.principal = { userId: sub };
    }catch{
        throw new RuntimeError(AuthError.InvalidToken, 401);
    }
};
