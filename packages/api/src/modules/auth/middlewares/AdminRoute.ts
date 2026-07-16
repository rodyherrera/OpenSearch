import RuntimeError from '@/shared/errors/RuntimeError';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '../contracts/domain/errors';
import User from '../models/User';

// Runs after AuthenticatedRoute (class-level middleware executes first), so
// req.principal is already set. Gates the route to admin operators only.
export const AdminRoute: MiddlewareFn = async (req) => {
    const userId = req.principal?.userId;
    if(!userId) throw new RuntimeError(AuthError.Unauthorized, 401);

    const user = await User.findById(userId).select('role');
    if(!user || user.role !== 'admin'){
        throw new RuntimeError(AuthError.Forbidden, 403);
    }
};
