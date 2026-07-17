import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import AuthService from '../services/AuthService';

const auth = new AuthService();

// Runs after AuthenticatedRoute (class-level middleware executes first), so
// req.principal is already set. Gates the route to admin operators only.
export const AdminRoute: MiddlewareFn = async (req) => {
    const userId = req.principal?.userId;
    if(!userId) throw new RuntimeError(AuthError.Unauthorized, 401);
    if(!(await auth.isAdmin(userId))) throw new RuntimeError(AuthError.Forbidden, 403);
};
