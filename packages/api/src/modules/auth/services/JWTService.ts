import jwt from 'jsonwebtoken';
import { config } from '@/shared/config';

export interface TokenPayload{
    sub: string;
}

export default class JWTService{
    sign(userId: string): string{
        return jwt.sign({ sub: userId }, config.auth.jwtSecret, { expiresIn: '7d' });
    }

    verify(token: string): TokenPayload{
        return jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    }
}
