import BaseController from '@/shared/controllers/BaseController';
import { Route } from '@/shared/controllers/Route';
import { Body } from '@/shared/controllers/RequestParams';
import { Middleware } from '@/shared/middlewares/Middleware';
import { AuthenticatedRoute } from '../middlewares/AuthenticatedRoute';
import { CurrentUser } from '../middlewares/CurrentUser';
import { LoginInput } from '../contracts/http/auth';
import AuthService from '../services/AuthService';

export default class AuthController extends BaseController{
    #auth = new AuthService();

    @Route('/login', 'POST')
    login(@Body() body: LoginInput){
        return this.#auth.login(body);
    }

    @Route('/me', 'GET')
    @Middleware(AuthenticatedRoute)
    me(@CurrentUser() userId: string){
        return this.#auth.me(userId);
    }
}
