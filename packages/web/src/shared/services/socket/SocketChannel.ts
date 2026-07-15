import { wsUrl } from '@/shared/utils/socket/wsUrl';
import { useAuthStore } from '@/modules/auth/store/auth';
import type { ChannelStatus, MessageHandler, OutboundFrame } from '@/shared/contracts/channel';

type StatusHandler = (status: ChannelStatus) => void;
type ErrorHandler = (message: string) => void;

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;

/**
 * One reconnecting WebSocket bound to a single channel path. Framework-agnostic:
 * no React, no globals. Listeners live on the channel (not the socket), so they
 * survive reconnects. The pool owns the lifecycle via the constructor and close().
 */
export default class SocketChannel{
    readonly #path: string;
    #socket: WebSocket | null = null;
    #status: ChannelStatus = 'connecting';
    #attempts = 0;
    #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    #released = false;

    readonly #listeners = new Map<string, Set<MessageHandler<unknown>>>();
    readonly #statusHandlers = new Set<StatusHandler>();
    readonly #errorHandlers = new Set<ErrorHandler>();

    constructor(path: string){
        this.#path = path;
        this.#bindNetworkRecovery();
        this.#connect();
    }

    get status(): ChannelStatus{
        return this.#status;
    }

    send(type: string, data?: unknown): void{
        if(this.#socket?.readyState !== WebSocket.OPEN) return;
        this.#socket.send(JSON.stringify({ type, ...(data as object) }));
    }

    on(type: string, handler: MessageHandler<unknown>): () => void{
        const handlers = this.#listeners.get(type) ?? new Set<MessageHandler<unknown>>();
        handlers.add(handler);
        this.#listeners.set(type, handlers);
        return () => {
            handlers.delete(handler);
            if(handlers.size === 0) this.#listeners.delete(type);
        };
    }

    onStatus(handler: StatusHandler): () => void{
        this.#statusHandlers.add(handler);
        handler(this.#status);
        return () => { this.#statusHandlers.delete(handler); };
    }

    onError(handler: ErrorHandler): () => void{
        this.#errorHandlers.add(handler);
        return () => { this.#errorHandlers.delete(handler); };
    }

    close(): void{
        this.#released = true;
        this.#clearReconnect();
        this.#unbindNetworkRecovery();
        this.#setStatus('closed');
        this.#socket?.close();
        this.#socket = null;
    }

    #connect(): void{
        if(this.#released) return;
        this.#clearReconnect();
        this.#setStatus(this.#attempts === 0 ? 'connecting' : 'reconnecting');

        const url = wsUrl(this.#path);
        const token = useAuthStore.getState().token;
        // Browsers can't set an Authorization header on the WS upgrade, so the JWT
        // rides as the sole subprotocol — the server reads it as the first protocol.
        const socket = token ? new WebSocket(url, token) : new WebSocket(url);
        this.#socket = socket;

        socket.onopen = () => {
            this.#attempts = 0;
            this.#setStatus('open');
        };
        socket.onmessage = (event) => this.#dispatch(event.data);
        socket.onclose = () => this.#onClose();
    }

    #onClose(): void{
        this.#socket = null;
        if(this.#released) return;
        this.#scheduleReconnect();
    }

    #scheduleReconnect(): void{
        this.#setStatus('reconnecting');
        const delay = this.#backoffDelay();
        this.#attempts += 1;
        this.#reconnectTimer = setTimeout(() => this.#connect(), delay);
    }

    // Equal jitter: half the capped exponential ceiling plus a random point in the other half.
    #backoffDelay(): number{
        const ceiling = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** this.#attempts);
        return ceiling / 2 + Math.random() * (ceiling / 2);
    }

    #clearReconnect(): void{
        if(this.#reconnectTimer === null) return;
        clearTimeout(this.#reconnectTimer);
        this.#reconnectTimer = null;
    }

    #dispatch(raw: unknown): void{
        if(typeof raw !== 'string') return;

        let frame: OutboundFrame;
        try{
            frame = JSON.parse(raw) as OutboundFrame;
        }catch{
            return;
        }

        if(typeof frame.error === 'string'){
            this.#errorHandlers.forEach((handler) => handler(frame.error as string));
            return;
        }
        if(typeof frame.type === 'string'){
            // Crawlm sends flat frames ({ type, ...fields }) with no `data` wrapper. Fall back
            // to the whole frame so live handlers receive the payload instead of undefined.
            const payload = ('data' in frame) ? frame.data : frame;
            this.#listeners.get(frame.type)?.forEach((handler) => handler(payload));
        }
    }

    #setStatus(status: ChannelStatus): void{
        if(status === this.#status) return;
        this.#status = status;
        this.#statusHandlers.forEach((handler) => handler(status));
    }

    #bindNetworkRecovery(): void{
        if(typeof window !== 'undefined') window.addEventListener('online', this.#recover);
        if(typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisibility);
    }

    #unbindNetworkRecovery(): void{
        if(typeof window !== 'undefined') window.removeEventListener('online', this.#recover);
        if(typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.#onVisibility);
    }

    #onVisibility = (): void => {
        if(document.visibilityState === 'visible') this.#recover();
    };

    #recover = (): void => {
        if(this.#released) return;
        const state = this.#socket?.readyState;
        if(state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
        this.#attempts = 0;
        this.#connect();
    };
}
