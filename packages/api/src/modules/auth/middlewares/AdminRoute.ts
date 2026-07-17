import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import AuthService from '../services/AuthService';

const auth = new AuthService();

export const AdminRoute: MiddlewareFn = async (req) => {
    const userId = req.principal?.userId;
    if(!userId) throw new RuntimeError(AuthError.Unauthorized, 401);
    if(!(await auth.isAdmin(userId))) throw new RuntimeError(AuthError.Forbidden, 403);
};
