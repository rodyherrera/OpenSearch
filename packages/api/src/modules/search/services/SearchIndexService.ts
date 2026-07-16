import { createHash } from 'crypto';
import { type Types } from 'mongoose';
import { getDomain } from 'tldts';
import { getMeili } from '@/shared/meili/MeilisearchClient';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';
import Website from '@/modules/website/models/Website';
import type { WebsitePageRecord } from '@/modules/website/contracts/domain/website';
import type { MeiliWebsiteDoc, MeiliContentPatch, IndexQuery, IndexQueryResult } from '@/modules/search/contracts/domain/searchIndex';

export interface WebsiteLean{
    _id: Types.ObjectId;
    url: string;
    domain?: string;
    title?: string;
    description?: string;
    keywords?: string;
    content?: string;
    workspaces?: Types.ObjectId[];
    createdAt?: Date;
}

export default class SearchIndexService{
    #index(){
        return getMeili().index(config.search.meili.index);
    }

    #meiliId(url: string): string{
        return createHash('sha1').update(url).digest('hex');
    }

    #excerpt(content?: string): string{
        return (content ?? '').slice(0, config.search.meili.contentMaxChars);
    }

    #fromRecord(record: WebsitePageRecord, createdAt: number, workspaceId?: string | null): MeiliWebsiteDoc{
        return {
            id: this.#meiliId(record.url),
            url: record.url,
            domain: getDomain(record.url) ?? '',
            title: record.title ?? '',
            description: record.description ?? '',
            keywords: record.keywords ?? '',
            content: this.#excerpt(record.content),
            workspaces: workspaceId ? [workspaceId] : [],
            createdAt: createdAt
        };
    }

    #fromMongo(doc: WebsiteLean): MeiliWebsiteDoc{
        return {
            id: this.#meiliId(doc.url),
            url: doc.url,
            domain: doc.domain || (getDomain(doc.url) ?? ''),
            title: doc.title ?? '',
            description: doc.description ?? '',
            keywords: doc.keywords ?? '',
            content: this.#excerpt(doc.content),
            workspaces: (doc.workspaces ?? []).map(String),
            createdAt: doc.createdAt ? doc.createdAt.getTime() : Date.now()
        };
    }

    fromRecord(record: WebsitePageRecord, createdAt: number, workspaceId?: string | null): MeiliWebsiteDoc{
        return this.#fromRecord(record, createdAt, workspaceId);
    }

    contentPatch(record: WebsitePageRecord): MeiliContentPatch{
        return {
            id: this.#meiliId(record.url),
            title: record.title ?? '',
            description: record.description ?? '',
            keywords: record.keywords ?? '',
            content: this.#excerpt(record.content)
        };
    }

    async ensureIndex(): Promise<void>{
        const client = getMeili();
        try{
            const task = await client.createIndex(config.search.meili.index, { primaryKey: 'id' });
            await client.tasks.waitForTask(task.taskUid);
        }catch(error){
            logger.debug(`meili createIndex: ${String(error)}`, { scope: 'meili' });
        }
        try{
            await this.#index().updateSettings({
                searchableAttributes: ['title', 'description', 'keywords', 'url', 'content'],
                filterableAttributes: ['workspaces', 'domain', 'createdAt'],
                sortableAttributes: ['createdAt'],
                pagination: { maxTotalHits: config.search.meili.maxTotalHits }
            });
            logger.info('Meilisearch index ensured', { scope: 'meili', index: config.search.meili.index });
        }catch(error){
            logger.error('Meilisearch ensureIndex failed', error as Error, { scope: 'meili' });
        }
    }

    async query(params: IndexQuery): Promise<IndexQueryResult>{
        const filter: string[] = [];
        if(params.workspaceId) filter.push(`workspaces = "${params.workspaceId}"`);
        if(params.newerThan){
            const since = Date.parse(params.newerThan);
            if(!Number.isNaN(since)) filter.push(`createdAt >= ${since}`);
        }
        const result = await this.#index().search(params.q ?? '', {
            filter: filter.length ? filter : undefined,
            sort: params.q ? undefined : ['createdAt:desc'],
            page: params.page,
            hitsPerPage: params.limit,
            attributesToRetrieve: ['url']
        });
        const urls = (result.hits as Array<{ url: string }>).map((hit) => hit.url);
        const total = (result as { totalHits?: number }).totalHits ?? urls.length;
        return { urls, total };
    }

    async index(docs: MeiliWebsiteDoc[]): Promise<void>{
        if(!docs.length) return;
        try{
            await this.#index().addDocuments(docs);
        }catch(error){
            logger.debug(`meili index: ${String(error)}`, { scope: 'meili' });
        }
    }

    async indexMongoDocs(docs: WebsiteLean[]): Promise<void>{
        await this.#index().addDocuments(docs.map((doc) => this.#fromMongo(doc)));
    }

    async pendingTasks(): Promise<number>{
        const tasks = await getMeili().tasks.getTasks({ statuses: ['enqueued', 'processing'], limit: 0 });
        return tasks.total;
    }

    async patchContent(patches: MeiliContentPatch[]): Promise<void>{
        if(!patches.length) return;
        try{
            await this.#index().updateDocuments(patches);
        }catch(error){
            logger.debug(`meili patchContent: ${String(error)}`, { scope: 'meili' });
        }
    }

    async reindexUrls(urls: string[]): Promise<void>{
        if(!urls.length) return;
        try{
            const docs = await Website.find({ url: { $in: urls } }).select('-markdown').lean<WebsiteLean[]>();
            await this.index(docs.map((doc) => this.#fromMongo(doc)));
        }catch(error){
            logger.debug(`meili reindexUrls: ${String(error)}`, { scope: 'meili' });
        }
    }

    async syncWorkspacesByUrls(urls: string[]): Promise<void>{
        if(!urls.length) return;
        try{
            const docs = await Website.find({ url: { $in: urls } }).select('url workspaces').lean<WebsiteLean[]>();
            if(!docs.length) return;
            await this.#index().updateDocuments(docs.map((doc) => ({
                id: this.#meiliId(doc.url),
                workspaces: (doc.workspaces ?? []).map(String)
            })));
        }catch(error){
            logger.debug(`meili syncWorkspacesByUrls: ${String(error)}`, { scope: 'meili' });
        }
    }

    async syncWorkspacesByDomains(domains: string[]): Promise<void>{
        if(!domains.length) return;
        try{
            const index = this.#index();
            let last: Types.ObjectId | null = null;
            for(;;){
                const filter: Record<string, unknown> = { domain: { $in: domains } };
                if(last) filter._id = { $gt: last };
                const docs = await Website.find(filter)
                    .select('url workspaces')
                    .sort({ _id: 1 })
                    .limit(config.search.meili.batchSize)
                    .lean<WebsiteLean[]>();
                if(!docs.length) break;
                await index.updateDocuments(docs.map((doc) => ({
                    id: this.#meiliId(doc.url),
                    workspaces: (doc.workspaces ?? []).map(String)
                })));
                last = docs[docs.length - 1]._id;
                if(docs.length < config.search.meili.batchSize) break;
            }
        }catch(error){
            logger.debug(`meili syncWorkspacesByDomains: ${String(error)}`, { scope: 'meili' });
        }
    }

    async deleteByUrls(urls: string[]): Promise<void>{
        if(!urls.length) return;
        try{
            await this.#index().deleteDocuments(urls.map((url) => this.#meiliId(url)));
        }catch(error){
            logger.debug(`meili deleteByUrls: ${String(error)}`, { scope: 'meili' });
        }
    }

    async deleteByDomain(domain: string): Promise<void>{
        const registrable = getDomain(domain) ?? domain;
        try{
            await this.#index().deleteDocuments({ filter: `domain = "${registrable}"` });
        }catch(error){
            logger.debug(`meili deleteByDomain: ${String(error)}`, { scope: 'meili' });
        }
    }

    async clear(): Promise<void>{
        try{
            await this.#index().deleteAllDocuments();
        }catch(error){
            logger.debug(`meili clear: ${String(error)}`, { scope: 'meili' });
        }
    }
}
