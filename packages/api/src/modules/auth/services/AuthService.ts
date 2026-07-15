import RuntimeError from '@/shared/errors/RuntimeError';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { AuthError } from '../contracts/domain/errors';
import { PublicAdmin } from '../contracts/domain/auth';
import { LoginInput } from '../contracts/http/auth';
import User from '../models/User';
import PasswordService from './PasswordService';
import JWTService from './JWTService';

export default class AuthService{
    #password = new PasswordService();
    #jwt = new JWTService();

    async login({ email, password }: LoginInput): Promise<{ token: string }>{
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if(!user || !(await this.#password.verify(password, user.passwordHash))){
            throw new RuntimeError(AuthError.InvalidCredentials, 401);
        }

        return { token: this.#jwt.sign(user.id) };
    }

    async me(userId: string): Promise<PublicAdmin>{
        const user = await User.findById(userId);
        if(!user) throw new RuntimeError(AuthError.Unauthorized, 401);

        return user.toJSON() as unknown as PublicAdmin;
    }

    async bootstrapAdmin(): Promise<void>{
        const { adminEmail, adminPassword } = config.auth;
        if(!adminEmail || !adminPassword){
            logger.warn('auth: ADMIN_EMAIL/ADMIN_PASSWORD unset, skipping admin bootstrap');
            return;
        }

        const email = adminEmail.toLowerCase().trim();
        const existing = await User.findOne({ email });

        if(!existing){
            await User.create({ email, passwordHash: await this.#password.hash(adminPassword), role: 'admin' });
            logger.info('auth: admin user created', { email });
            return;
        }

        if(!(await this.#password.verify(adminPassword, existing.passwordHash))){
            existing.passwordHash = await this.#password.hash(adminPassword);
            await existing.save();
            logger.info('auth: admin password updated', { email });
            return;
        }

        logger.info('auth: admin user already current', { email });
    }
}
