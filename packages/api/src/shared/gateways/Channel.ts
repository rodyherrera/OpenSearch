const channelByGateway = new WeakMap<object, string>();

export const Channel = (path: string): ClassDecorator => {
    return (target) => {
        channelByGateway.set(target, path);
    };
};

export const getChannel = (ctor: object): string | undefined => {
    return channelByGateway.get(ctor);
};
