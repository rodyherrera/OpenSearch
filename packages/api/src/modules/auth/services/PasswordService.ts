import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export default class PasswordService{
    async hash(password: string): Promise<string>{
        const salt = randomBytes(16).toString('hex');
        const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
        return `${salt}:${derived.toString('hex')}`;
    }

    async verify(password: string, stored: string): Promise<boolean>{
        const [salt, hash] = stored.split(':');
        if(!salt || !hash) return false;

        const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
        const expected = Buffer.from(hash, 'hex');
        return derived.length === expected.length && timingSafeEqual(derived, expected);
    }
}
