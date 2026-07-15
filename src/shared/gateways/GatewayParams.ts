import { createParamDecorator } from '@/shared/controllers/params';
import { PAYLOAD, SOCKET, type GatewayContext } from './context';

export const Payload = (): ParameterDecorator =>
    createParamDecorator((req) => (req as GatewayContext)[PAYLOAD]);

export const Socket = (): ParameterDecorator =>
    createParamDecorator((req) => (req as GatewayContext)[SOCKET]);
