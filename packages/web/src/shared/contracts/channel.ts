import type {
    SnapshotFrame,
    PageFrame,
    BatchFrame,
    WsSnapshotFrame,
    WsPageFrame,
    WsSeedFrame,
    WsRemovedFrame,
    ChangeFrame
} from '@/shared/contracts/live';

export type ChannelStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface OutboundFrame{
    type?: string;
    data?: unknown;
    error?: string;
}

export type MessageHandler<T> = (data: T) => void;

export interface ChannelHandlers{
    [type: string]: MessageHandler<unknown>;
}

export interface ChannelMap{
    '/ws': {
        snapshot: SnapshotFrame;
        page: PageFrame;
        batch: BatchFrame;
        'ws:snapshot': WsSnapshotFrame;
        'ws:page': WsPageFrame;
        'ws:seed': WsSeedFrame;
        'ws:removed': WsRemovedFrame;
        change: ChangeFrame;
    };
}

export type HandlersFor<P extends string> = P extends keyof ChannelMap
    ? { [K in keyof ChannelMap[P]]?: MessageHandler<ChannelMap[P][K]> }
    : ChannelHandlers;

export interface ChannelApi{
    send: (type: string, data?: unknown) => void;
    status: ChannelStatus;
}
