import { useCallback, useEffect, useRef, useState } from 'react';
import { channelPool } from '@/shared/services/socket/ChannelPool';
import type { ChannelApi, ChannelHandlers, ChannelStatus, HandlersFor } from '@/shared/contracts/channel';

export const useChannel = <P extends string>(path: P, handlers: HandlersFor<P>): ChannelApi => {
    const [status, setStatus] = useState<ChannelStatus>('connecting');

    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        const channel = channelPool.acquire(path);
        const offStatus = channel.onStatus(setStatus);

        const offs = Object.keys(handlersRef.current as ChannelHandlers).map((type) =>
            channel.on(type, (data) => (handlersRef.current as ChannelHandlers)[type]?.(data))
        );

        return () => {
            offStatus();
            offs.forEach((off) => off());
            channelPool.release(path);
        };
    }, [path]);

    const send = useCallback((type: string, data?: unknown) => channelPool.peek(path)?.send(type, data), [path]);

    return { send, status };
};
