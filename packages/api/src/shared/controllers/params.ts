import ClassMetadata from '@/core/utils/ClassMetadata';
import { ParamBinding, ParamResolver } from '@/shared/contracts/params';

const bindingsByController = new ClassMetadata<ParamBinding>();

export const createParamDecorator = (resolve: ParamResolver): ParameterDecorator => {
    return (target, handlerName, index) => {
        if(handlerName === undefined) return;
        bindingsByController.append(target.constructor, { handlerName, index, resolve });
    };
};

export const getParamResolvers = (ctor: object, handlerName: string | symbol): ParamResolver[] => {
    const bindings = bindingsByController.get(ctor).filter((binding) => binding.handlerName === handlerName);

    const resolvers: ParamResolver[] = [];
    for(const binding of bindings){
        resolvers[binding.index] = binding.resolve;
    }
    return resolvers;
};
