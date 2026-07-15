import RuntimeError from '@/shared/errors/RuntimeError';
import { ConfigError } from '@/shared/errors/ConfigError';

const required = (key: string): string => {
    const value = process.env[key];
    if(value === undefined || value === '') throw new RuntimeError(`${ConfigError.MissingEnv}:${key}`, 500);
    return value;
};

const optional = (key: string, fallback: string): string => {
    const value = process.env[key];
    return value === undefined || value === '' ? fallback : value;
};

const toInt = (value: string, fallback: number): number => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value: string, fallback: boolean): boolean => {
    if(value === '') return fallback;
    return value === 'true' || value === '1';
};

export const config = {
    server: {
        port: toInt(optional('SERVER_PORT', '5000'), 5000),
        host: optional('SERVER_HOST', '0.0.0.0')
    },
    apiPrefix: optional('API_PREFIX', '/api/v1'),
    corsOrigin: optional('CORS_ORIGIN', '*'),

    mongo: {
        uri: required('MONGO_URI'),
        db: optional('MONGO_DB', 'crawlm')
    },

    redis: {
        uri: required('REDIS_URI')
    },

    auth: {
        jwtSecret: required('JWT_SECRET'),
        adminEmail: optional('ADMIN_EMAIL', ''),
        adminPassword: optional('ADMIN_PASSWORD', '')
    },

    log: {
        level: optional('LOG_LEVEL', 'info'),
        pretty: toBool(optional('LOG_PRETTY', 'true'), true)
    },

    crawler: {
        concurrency: toInt(optional('CRAWLER_CONCURRENCY', '64'), 64),
        batchSize: toInt(optional('CRAWLER_BATCH_SIZE', '128'), 128),
        domainDelayMs: toInt(optional('CRAWLER_DOMAIN_DELAY_MS', '1500'), 1500),
        maxLinksPerPage: toInt(optional('CRAWLER_MAX_LINKS_PER_PAGE', '40'), 40),
        maxFrontier: toInt(optional('CRAWLER_MAX_FRONTIER', '500000'), 500000),
        maxPages: toInt(optional('CRAWLER_MAX_PAGES', '0'), 0),
        respectRobots: toBool(optional('CRAWLER_RESPECT_ROBOTS', 'true'), true),
        timeoutMs: toInt(optional('CRAWLER_TIMEOUT_MS', '15000'), 15000),
        replicas: toInt(optional('CRAWLER_REPLICAS', '3'), 3),
        // Stop chasing a site once this many of its pages are stored (starve deep
        // sinks so the crawl fans out across more domains). 0 = unlimited.
        maxPagesPerDomain: toInt(optional('CRAWLER_MAX_PAGES_PER_DOMAIN', '25'), 25),
        // Cap same-domain links harvested per page; external links are always kept.
        maxInternalLinks: toInt(optional('CRAWLER_MAX_INTERNAL_LINKS', '5'), 5)
    },

    // External domain-discovery feeds (run by the standalone `sources` process).
    sources: {
        certstreamEnabled: toBool(optional('SOURCES_CERTSTREAM_ENABLED', 'true'), true),
        // A CertStream-compatible WS feed of newly-issued TLS certs (self-hosted
        // certstream-server-go by default; the public feed is dead).
        certstreamUrl: optional('SOURCES_CERTSTREAM_URL', 'ws://certstream:8080/full-stream'),
        maxPerFlush: toInt(optional('SOURCES_MAX_PER_FLUSH', '200'), 200),
        flushMs: toInt(optional('SOURCES_FLUSH_MS', '2000'), 2000)
    }
} as const;
