import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Body, Param } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { AuthenticatedRoute } from '@/modules/auth/middlewares/AuthenticatedRoute';
import { CurrentUser } from '@/modules/auth/middlewares/CurrentUser';
import WorkspaceService from '@/modules/workspace/services/WorkspaceService';
import type { PublicWorkspace, CreateWorkspaceBody, UpdateWorkspaceBody } from '@/modules/workspace/contracts/domain/workspace';

@Middleware(AuthenticatedRoute)
export default class WorkspaceController extends BaseController{
    #service = new WorkspaceService();

    @Route('/', 'GET')
    list(@CurrentUser() userId: string): Promise<PublicWorkspace[]>{
        return this.#service.listForUser(userId);
    }

    @Route('/', 'POST')
    create(@CurrentUser() userId: string, @Body() body: CreateWorkspaceBody): Promise<PublicWorkspace>{
        return this.#service.create(userId, body?.name);
    }

    @Route('/:id', 'PATCH')
    update(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: UpdateWorkspaceBody): Promise<PublicWorkspace>{
        return this.#service.update(userId, id, Boolean(body?.followExternal));
    }
}
