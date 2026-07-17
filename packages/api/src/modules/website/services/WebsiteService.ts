import { createHash } from 'crypto';
import mongoose from 'mongoose';
import _ from 'lodash';
import { getDomain } from 'tldts';
import Website, { type WebsiteDocument } from '@/modules/website/models/Website';
import SearchIndexService from '@/modules/search/services/SearchIndexService';
import CrawlEventPublisher from '@/modules/fleet/services/CrawlEventPublisher';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { MeiliWebsiteDoc, MeiliContentPatch } from '@/modules/search/contracts/domain/searchIndex';
import type { WebsitePageRecord, ScrapedRecord, PublicWebsite, DomainPageCount, RefreshResult } from '@/modules/website/contracts/domain/website';

const contentHashOf = (record: WebsitePageRecord): string =>
    createHash('sha1').update(`${record.title} ${record.description} ${record.content}`).digest('hex');

export default class WebsiteService{
    #searchIndex = new SearchIndexService();
    #publisher = new CrawlEventPublisher();

    async bulkUpsert(records: WebsitePageRecord[], workspaceByUrl?: Map<string, string | null | undefined>): Promise<number>{
        if(!records.length) return 0;
        const now = new Date();
        const bulkOps = records.map((record) => {
            const { url, title, description, keywords, content, metaData } = record;
            const workspaceId = workspaceByUrl?.get(url);
            const update: Record<string, unknown> = {
                $setOnInsert: {
                    url,
                    domain: getDomain(url) ?? '',
                    title,
                    description,
                    keywords,
                    content,
                    metaData,
                    contentHash: contentHashOf(record),
                    lastCheckedAt: now
                }
            };
            if(workspaceId) update.$addToSet = { workspaces: workspaceId };
            return { updateOne: { filter: { url }, update, upsert: true } };
        });
        const result = await Website.bulkWrite(bulkOps, { ordered: false });
        const insertedIndexes = Object.keys(result.upsertedIds ?? {}).map(Number);
        if(insertedIndexes.length){
            const docs = insertedIndexes.map((i) =>
                this.#searchIndex.fromRecord(records[i], now.getTime(), workspaceByUrl?.get(records[i].url)));
            void this.#searchIndex.index(docs);
        }
        return bulkOps.length;
    }

    async refreshUpsert(records: WebsitePageRecord[], workspaceByUrl: Map<string, string | null | undefined>): Promise<RefreshResult>{
        if(!records.length) return { inserted: [], changed: [] };
        const urls = records.map((record) => record.url);
        const existing = await Website.find({ url: { $in: urls } })
            .select('url contentHash')
            .lean<Array<{ url: string; contentHash?: string }>>();
        const existingSet = new Set(existing.map((doc) => doc.url));
        const hashByUrl = new Map(existing.map((doc) => [doc.url, doc.contentHash]));

        const now = new Date();
        const inserted: string[] = [];
        const changed: string[] = [];
        const newDocs: MeiliWebsiteDoc[] = [];
        const changedPatches: MeiliContentPatch[] = [];
        const ops: mongoose.AnyBulkWriteOperation<WebsiteDocument>[] = [];
        for(const record of records){
            const { url, title, description, keywords, content, metaData } = record;
            const workspaceId = workspaceByUrl.get(url);
            const membership = workspaceId ? { $addToSet: { workspaces: workspaceId } } : {};
            const hash = contentHashOf(record);

            if(!existingSet.has(url)){
                inserted.push(url);
                newDocs.push(this.#searchIndex.fromRecord(record, now.getTime(), workspaceId));
                ops.push({ updateOne: {
                    filter: { url },
                    update: {
                        $setOnInsert: {
                            url,
                            domain: getDomain(url) ?? '',
                            title,
                            description,
                            keywords,
                            content,
                            metaData,
                            contentHash: hash,
                            lastCheckedAt: now
                        },
                        ...membership
                    },
                    upsert: true
                } });
            }else if(hashByUrl.get(url) !== hash){
                changed.push(url);
                changedPatches.push(this.#searchIndex.contentPatch(record));
                ops.push({ updateOne: {
                    filter: { url },
                    update: {
                        $set: { title, description, keywords, content, metaData, contentHash: hash, lastCheckedAt: now, updatedAt: now },
                        ...membership
                    },
                    timestamps: false
                } });
            }else{
                ops.push({ updateOne: {
                    filter: { url },
                    update: { $set: { lastCheckedAt: now }, ...membership },
                    timestamps: false
                } });
            }
        }
        if(ops.length) await Website.bulkWrite(ops, { ordered: false });
        void this.#searchIndex.index(newDocs);
        void this.#searchIndex.patchContent(changedPatches);
        return { inserted, changed };
    }

    async listRecent(limit: number, workspaceId?: string): Promise<PublicWebsite[]>{
        const find: Record<string, unknown> = {};
        if(workspaceId) find.workspaces = new mongoose.Types.ObjectId(workspaceId);
        const records = await Website.find(find).sort({ createdAt: -1 }).limit(limit).select('-markdown -content');
        return records.map((record) => record.toJSON() as PublicWebsite);
    }

    async stampWorkspaceByDomains(domains: string[], workspaceId: string): Promise<number>{
        if(!domains.length) return 0;
        const result = await Website.updateMany(
            { domain: { $in: domains } },
            { $addToSet: { workspaces: workspaceId } }
        );
        void this.#searchIndex.syncWorkspacesByDomains(domains);
        return result.modifiedCount ?? 0;
    }

    async stampWorkspaceByUrls(urls: string[], workspaceId: string): Promise<number>{
        if(!urls.length) return 0;
        const result = await Website.updateMany(
            { url: { $in: urls } },
            { $addToSet: { workspaces: workspaceId } }
        );
        void this.#searchIndex.syncWorkspacesByUrls(urls);
        return result.modifiedCount ?? 0;
    }

    async estimatedCount(): Promise<number>{
        return Website.estimatedDocumentCount();
    }

    async saveScraped(page: ScrapedRecord): Promise<void>{
        await Website.updateOne(
            { url: page.url },
            {
                $set: {
                    domain: getDomain(page.url) ?? '',
                    title: page.title,
                    description: page.description,
                    keywords: page.keywords,
                    content: page.content,
                    markdown: page.markdown,
                    metaData: page.metaData
                }
            },
            { upsert: true }
        );
        void this.#searchIndex.reindexUrls([page.url]);
    }

    async findByUrl(url: string): Promise<WebsiteDocument | null>{
        return Website.findOne({ url }).lean<WebsiteDocument>();
    }

    async findByUrlsOrdered(urls: string[], select: string): Promise<WebsiteDocument[]>{
        if(!urls.length) return [];
        const docs = await Website.find({ url: { $in: urls } }).select(select);
        const byUrl = new Map(docs.map((doc) => [doc.url, doc]));
        const ordered: WebsiteDocument[] = [];
        for(const url of urls){
            const doc = byUrl.get(url);
            if(doc) ordered.push(doc);
        }
        return ordered;
    }

    async listUrlsByDomain(domain: string, limit = 5000): Promise<string[]>{
        const docs = await Website.find({ domain })
            .select('url')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<Array<{ url: string }>>();
        return docs.map((doc) => doc.url);
    }

    async recentUrls(limit: number): Promise<string[]>{
        const known = await Website.aggregate<{ url: string }>([
            { $sort: { createdAt: -1 } },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
        return known.map((doc) => doc.url);
    }

    async listDomains(limit = 1000, workspaceId?: string): Promise<DomainPageCount[]>{
        const match: Record<string, unknown> = { domain: { $exists: true, $ne: '' } };
        if(workspaceId) match.workspaces = new mongoose.Types.ObjectId(workspaceId);
        return Website.aggregate<{ domain: string; pages: number }>([
            { $match: match },
            { $group: { _id: '$domain', pages: { $sum: 1 } } },
            { $sort: { pages: -1 } },
            { $limit: limit },
            { $project: { _id: 0, domain: '$_id', pages: 1 } }
        ]);
    }

    async backfillDomains(batchSize = 1000): Promise<number>{
        let updated = 0;
        for(;;){
            const docs = await Website.find({ domain: { $exists: false } })
                .select('url')
                .limit(batchSize)
                .lean<Array<{ _id: mongoose.Types.ObjectId; url: string }>>();
            if(!docs.length) break;
            await Website.bulkWrite(docs.map(({ _id, url }) => ({
                updateOne: {
                    filter: { _id },
                    update: { $set: { domain: getDomain(url) ?? '' } }
                }
            })), { ordered: false });
            updated += docs.length;
        }
        return updated;
    }

    async deleteById(id: string): Promise<boolean>{
        if(!mongoose.isValidObjectId(id)){
            throw new RuntimeError(RequestError.InvalidId ?? 'Request::InvalidId', 400);
        }
        const doc = await Website.findByIdAndDelete(id);
        if(doc){
            void this.#searchIndex.deleteByUrls([doc.url]);
            const now = Date.now();
            for(const wsId of doc.workspaces ?? []){
                void this.#publisher.publishRemoved(String(wsId), 'page', { id: doc.id, url: doc.url }, now);
            }
        }
        return !!doc;
    }

    async purge({ domain, all }: { domain?: string; all?: boolean }): Promise<number>{
        if(all){
            const result = await Website.deleteMany({});
            void this.#searchIndex.clear();
            return result.deletedCount ?? 0;
        }
        if(domain){
            const pattern = new RegExp('^https?://([a-z0-9-]+\\.)*' + _.escapeRegExp(domain) + '(/|$)', 'i');
            const result = await Website.deleteMany({ url: pattern });
            void this.#searchIndex.deleteByDomain(domain);
            return result.deletedCount ?? 0;
        }
        throw new RuntimeError(RequestError.ValidationFailed ?? 'Request::ValidationFailed', 400);
    }
}
