import { WebSocket } from 'ws';
import CrawlFrontier from '@/modules/fleet/services/CrawlFrontier';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import type { RawData } from 'ws';

const NOISE_DOMAINS = new Set([
    'amazonaws.com', 'cloudfront.net', 'googleusercontent.com', 'azurewebsites.net',
    'herokuapp.com', 'herokudns.com', 'vercel.app', 'netlify.app', 'pages.dev',
    'workers.dev', 'r2.dev', 'github.io', 'fastly.net', 'akamaized.net', 'sentry.io',
    'cloudflare.com', 'cloudflaressl.com', 'wordpress.com', 'shopify.com', 'myshopify.com'
]);

interface CertStreamMessage{
    message_type?: string;
    data?: { leaf_cert?: { all_domains?: string[] } };
}

export default class CertStreamSource{
    #frontier = new CrawlFrontier();
    #socket: WebSocket | null = null;
    #pending = new Set<string>();
    #flushTimer: ReturnType<typeof setInterval> | null = null;
    #attempts = 0;
    #running = false;
    #seeded = 0;

    start(): void{
        this.#running = true;
        this.#connect();
        this.#flushTimer = setInterval(() => { void this.#flush(); }, config.sources.flushMs);
    }

    stop(): void{
        this.#running = false;
        if(this.#flushTimer) clearInterval(this.#flushTimer);
        this.#socket?.close();
        this.#socket = null;
    }

    #connect(): void{
        if(!this.#running) return;
        const socket = new WebSocket(config.sources.certstreamUrl);
        this.#socket = socket;
        socket.on('open', () => {
            this.#attempts = 0;
            logger.info(`CertStream -> connected (${config.sources.certstreamUrl}).`);
        });
        socket.on('message', (raw: RawData) => this.#ingest(raw));
        socket.on('close', () => this.#scheduleReconnect());
        socket.on('error', (error) => {
            logger.debug(`CertStream -> socket error: ${error}`);
            socket.close();
        });
    }

    #scheduleReconnect(): void{
        this.#socket = null;
        if(!this.#running) return;
        const delay = Math.min(30000, 1000 * 2 ** this.#attempts);
        this.#attempts += 1;
        setTimeout(() => this.#connect(), delay);
    }

    #ingest(raw: RawData): void{
        let message: CertStreamMessage;
        try{
            message = JSON.parse(raw.toString()) as CertStreamMessage;
        }catch{
            return;
        }
        if(message.message_type !== 'certificate_update') return;
        const domains = message.data?.leaf_cert?.all_domains;
        if(!domains) return;
        for(const entry of domains){
            const domain = UrlNormalizer.domainOf(`https://${entry.replace(/^\*\./, '')}`);
            if(domain && !NOISE_DOMAINS.has(domain)) this.#pending.add(domain);
        }
    }

    async #flush(): Promise<void>{
        if(!this.#pending.size) return;
        const batch = [...this.#pending].slice(0, config.sources.maxPerFlush);
        this.#pending.clear();
        const urls = batch.map((domain) => `https://${domain}`);
        const added = await this.#frontier.enqueue(urls).catch(() => 0);
        if(added){
            this.#seeded += added;
            logger.info(`CertStream -> seeded ${added} fresh domains into the frontier (total ${this.#seeded}).`);
        }
    }
}
