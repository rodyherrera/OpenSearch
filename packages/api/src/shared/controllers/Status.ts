const statusByHandler = new WeakMap<object, Map<string | symbol, number>>();

export const Status = (code: number): MethodDecorator => {
    return (target, handlerName) => {
        const ctor = target.constructor;

        let codes = statusByHandler.get(ctor);
        if(!codes){
            codes = new Map();
            statusByHandler.set(ctor, codes);
        }

        codes.set(handlerName, code);
    };
};

export const getStatus = (ctor: object, handlerName: string | symbol): number | undefined => {
    return statusByHandler.get(ctor)?.get(handlerName);
};
