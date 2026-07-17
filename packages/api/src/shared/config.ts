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

    app: {
        url: optional('APP_URL', optional('CORS_ORIGIN', 'http://localhost:8090'))
    },

    mail: {
        smtpHost: optional('SMTP_HOST', ''),
        smtpPort: toInt(optional('SMTP_PORT', '587'), 587),
        smtpUser: optional('SMTP_USER', ''),
        smtpPass: optional('SMTP_PASS', ''),
        smtpSecure: toBool(optional('SMTP_SECURE', 'false'), false),
        from: optional('MAIL_FROM', 'Crawlm <no-reply@crawlm.local>')
    },

    mongo: {
        uri: required('MONGO_URI'),
        db: optional('MONGO_DB', 'crawlm')
    },

    redis: {
        uri: required('REDIS_URI')
    },

    search: {
        meili: {
            host: optional('MEILI_URL', 'http://meilisearch:7700'),
            apiKey: optional('MEILI_MASTER_KEY', ''),
            index: optional('MEILI_INDEX', 'websites'),
            contentMaxChars: toInt(optional('MEILI_CONTENT_MAX_CHARS', '4000'), 4000),
            maxTotalHits: toInt(optional('MEILI_MAX_TOTAL_HITS', '10000'), 10000),
            batchSize: toInt(optional('MEILI_BATCH_SIZE', '1000'), 1000)
        }
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
        workspaceDomainDelayMs: toInt(optional('CRAWLER_WORKSPACE_DOMAIN_DELAY_MS', '1000'), 1000),
        workspaceDomainConcurrency: toInt(optional('CRAWLER_WORKSPACE_DOMAIN_CONCURRENCY', '20'), 20),
        maxLinksPerPage: toInt(optional('CRAWLER_MAX_LINKS_PER_PAGE', '40'), 40),
        maxFrontier: toInt(optional('CRAWLER_MAX_FRONTIER', '500000'), 500000),
        maxPages: toInt(optional('CRAWLER_MAX_PAGES', '0'), 0),
        respectRobots: toBool(optional('CRAWLER_RESPECT_ROBOTS', 'true'), true),
        timeoutMs: toInt(optional('CRAWLER_TIMEOUT_MS', '15000'), 15000),
        replicas: toInt(optional('CRAWLER_REPLICAS', '3'), 3),
        maxPagesPerDomain: toInt(optional('CRAWLER_MAX_PAGES_PER_DOMAIN', '25'), 25),
        maxInternalLinks: toInt(optional('CRAWLER_MAX_INTERNAL_LINKS', '5'), 5),
        workspaceMaxInternalLinks: toInt(optional('CRAWLER_WORKSPACE_MAX_INTERNAL_LINKS', '60'), 60)
    },

    refresh: {
        enabled: toBool(optional('REFRESH_ENABLED', 'true'), true),
        intervalMs: toInt(optional('REFRESH_INTERVAL_MS', '300000'), 300000),
        batchPerWorkspace: toInt(optional('REFRESH_BATCH_PER_WORKSPACE', '100'), 100),
        maxSeedsPerWorkspace: toInt(optional('REFRESH_MAX_SEEDS_PER_WORKSPACE', '200'), 200)
    },

    publicApi: {
        rateLimitPerMin: toInt(optional('PUBLIC_API_RATE_LIMIT_PER_MIN', '120'), 120),
        scrapeCacheMaxAgeMs: toInt(optional('PUBLIC_API_SCRAPE_CACHE_MS', '86400000'), 86400000)
    },

    sources: {
        certstreamEnabled: toBool(optional('SOURCES_CERTSTREAM_ENABLED', 'true'), true),
        certstreamUrl: optional('SOURCES_CERTSTREAM_URL', 'ws://certstream:8080/full-stream'),
        maxPerFlush: toInt(optional('SOURCES_MAX_PER_FLUSH', '200'), 200),
        flushMs: toInt(optional('SOURCES_FLUSH_MS', '2000'), 2000)
    }
} as const;
