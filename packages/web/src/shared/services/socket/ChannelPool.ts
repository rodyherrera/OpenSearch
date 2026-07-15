import SocketChannel from '@/shared/services/socket/SocketChannel';

interface PoolEntry{
    channel: SocketChannel;
    refs: number;
}

class ChannelPool{
    readonly #entries = new Map<string, PoolEntry>();

    acquire(path: string): SocketChannel{
        const entry = this.#entries.get(path);
        if(entry){
            entry.refs += 1;
            return entry.channel;
        }
        const channel = new SocketChannel(path);
        this.#entries.set(path, { channel, refs: 1 });
        return channel;
    }

    release(path: string): void{
        const entry = this.#entries.get(path);
        if(!entry) return;
        entry.refs -= 1;
        if(entry.refs <= 0){
            entry.channel.close();
            this.#entries.delete(path);
        }
    }

    peek(path: string): SocketChannel | undefined{
        return this.#entries.get(path)?.channel;
    }
}

export const channelPool = new ChannelPool();
