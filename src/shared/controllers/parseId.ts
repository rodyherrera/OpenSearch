import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';

export const parseId = (raw: unknown): number => {
    const value = Number(raw);
    if(!Number.isInteger(value) || value <= 0){
        throw new RuntimeError(RequestError.InvalidId, 400);
    }
    return value;
};
