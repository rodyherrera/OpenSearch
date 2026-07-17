import { randomBytes, createHash } from 'node:crypto';
import RuntimeError from '@/shared/errors/RuntimeError';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import { enforceRateLimit } from '@/shared/rateLimit';
import { sendPasswordReset } from '@/shared/mail/Mailer';
import WorkspaceService from '@/modules/workspace/services/WorkspaceService';
import { AuthError } from '../contracts/domain/errors';
import { PublicAdmin } from '../contracts/domain/auth';
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from '../contracts/http/auth';
import User from '../models/User';
import PasswordResetToken from '../models/PasswordResetToken';
import PasswordService from './PasswordService';
import JWTService from './JWTService';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;
const RESET_TTL_MS = 3600_000;

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

    async isAdmin(userId: string): Promise<boolean>{
        const user = await User.findById(userId).select('role');
        return user?.role === 'admin';
    }

    async register({ email, password }: RegisterInput): Promise<{ token: string }>{
        const normalized = email.toLowerCase().trim();
        await enforceRateLimit('register', normalized, 5, AuthError.RateLimited, 3600);
        if(!EMAIL_RE.test(normalized)) throw new RuntimeError(AuthError.InvalidEmail, 400);
        if((password ?? '').length < MIN_PASSWORD) throw new RuntimeError(AuthError.WeakPassword, 400);

        if(await User.findOne({ email: normalized })) throw new RuntimeError(AuthError.EmailInUse, 409);

        let user;
        try{
            user = await User.create({ email: normalized, passwordHash: await this.#password.hash(password), role: 'member' });
        }catch(error){
            if((error as { code?: number }).code === 11000) throw new RuntimeError(AuthError.EmailInUse, 409);
            throw error;
        }

        await new WorkspaceService().create(user.id, 'Personal');
        logger.info('auth: user registered', { email: normalized });
        return { token: this.#jwt.sign(user.id) };
    }

    async requestPasswordReset({ email }: ForgotPasswordInput): Promise<{ ok: true }>{
        const normalized = email.toLowerCase().trim();
        await enforceRateLimit('forgot', normalized, 3, AuthError.RateLimited, 3600);

        const user = await User.findOne({ email: normalized });
        if(user){
            await PasswordResetToken.deleteMany({ userId: user._id });
            const token = randomBytes(32).toString('hex');
            await PasswordResetToken.create({
                userId: user._id,
                tokenHash: createHash('sha256').update(token).digest('hex'),
                expiresAt: new Date(Date.now() + RESET_TTL_MS)
            });
            const link = `${config.app.url.replace(/\/$/, '')}/reset-password?token=${token}`;
            await sendPasswordReset(normalized, link);
        }

        return { ok: true };
    }

    async resetPassword({ token, password }: ResetPasswordInput): Promise<{ token: string }>{
        if((password ?? '').length < MIN_PASSWORD) throw new RuntimeError(AuthError.WeakPassword, 400);

        const tokenHash = createHash('sha256').update(token ?? '').digest('hex');
        const record = await PasswordResetToken.findOne({ tokenHash });
        if(!record || record.expiresAt.getTime() < Date.now()){
            throw new RuntimeError(AuthError.InvalidToken, 400);
        }

        const user = await User.findById(record.userId);
        if(!user) throw new RuntimeError(AuthError.InvalidToken, 400);

        user.passwordHash = await this.#password.hash(password);
        await user.save();
        await PasswordResetToken.deleteMany({ userId: user._id });
        logger.info('auth: password reset', { user: user.id });
        return { token: this.#jwt.sign(user.id) };
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
