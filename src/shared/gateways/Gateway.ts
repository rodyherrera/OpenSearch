import ClassMetadata from '@/core/utils/ClassMetadata';
import { GatewayHandler } from '@/shared/contracts/gateway';

const handlersByGateway = new ClassMetadata<GatewayHandler>();

export const OnConnect = (): MethodDecorator => {
    return (target, handlerName) => {
        handlersByGateway.append(target.constructor, { kind: 'connect', handlerName });
    };
};

export const OnDisconnect = (): MethodDecorator => {
    return (target, handlerName) => {
        handlersByGateway.append(target.constructor, { kind: 'disconnect', handlerName });
    };
};

export const OnMessage = (type: string): MethodDecorator => {
    return (target, handlerName) => {
        handlersByGateway.append(target.constructor, { kind: 'message', type, handlerName });
    };
};

export const getGatewayHandlers = (ctor: object): GatewayHandler[] => {
    return handlersByGateway.get(ctor);
};
