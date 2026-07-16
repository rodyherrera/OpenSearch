import RuntimeError from '@/shared/errors/RuntimeError';
import { createParamDecorator } from '@/shared/controllers/params';
import { type MiddlewareFn } from '@/shared/middlewares/Middleware';
import { AuthError } from '@/modules/auth/contracts/domain/errors';
import { WorkspaceError } from '@/modules/workspace/contracts/domain/workspace';
import WorkspaceService from '@/modules/workspace/services/WorkspaceService';

// Resolves the active workspace for the request. Reads the X-Workspace-Id header
// and confirms the authenticated user belongs to it; if the header is absent or
// invalid, falls back to the user's default (oldest) workspace. Must run after
// AuthenticatedRoute so req.principal is set.
export const CurrentWorkspace: MiddlewareFn = async (req) => {
    const userId = req.principal?.userId;
    if(!userId) throw new RuntimeError(AuthError.Unauthorized, 401);

    const service = new WorkspaceService();
    const headerId = (req.headers['x-workspace-id'] as string | undefined)?.trim();

    const workspace = headerId
        ? await service.getIfMember(headerId, userId)
        : null;
    const resolved = workspace ?? await service.firstForUser(userId);

    if(!resolved) throw new RuntimeError(WorkspaceError.NotFound, 404);
    req.workspace = { id: resolved.id };
};

export const CurrentWorkspaceId = (): ParameterDecorator =>
    createParamDecorator((req) => (req as { workspace?: { id: string } }).workspace?.id);
