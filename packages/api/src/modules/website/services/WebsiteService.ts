import mongoose from 'mongoose';
import _ from 'lodash';
import { getDomain } from 'tldts';
import Website, { type WebsiteDocument } from '@/modules/website/models/Website';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { WebsitePageRecord, ScrapedRecord } from '@/modules/website/contracts/domain/website';

export default class WebsiteService{
    async bulkUpsert(records: WebsitePageRecord[], workspaceByUrl?: Map<string, string | null | undefined>): Promise<number>{
        if(!records.length) return 0;
        const bulkOps = records.map(({ url, title, description, keywords, content, metaData }) => {
            const workspaceId = workspaceByUrl?.get(url);
            const update: Record<string, unknown> = {
                $setOnInsert: { url, domain: getDomain(url) ?? '', title, description, keywords, content, metaData }
            };
            if(workspaceId) update.$addToSet = { workspaces: workspaceId };
            return { updateOne: { filter: { url }, update, upsert: true } };
        });
        await Website.bulkWrite(bulkOps, { ordered: false });
        return bulkOps.length;
    }

    async stampWorkspaceByDomains(domains: string[], workspaceId: string): Promise<number>{
        if(!domains.length) return 0;
        const result = await Website.updateMany(
            { domain: { $in: domains } },
            { $addToSet: { workspaces: workspaceId } }
        );
        return result.modifiedCount ?? 0;
    }

    async stampWorkspaceByUrls(urls: string[], workspaceId: string): Promise<number>{
        if(!urls.length) return 0;
        const result = await Website.updateMany(
            { url: { $in: urls } },
            { $addToSet: { workspaces: workspaceId } }
        );
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
    }

    async findByUrl(url: string): Promise<WebsiteDocument | null>{
        return Website.findOne({ url }).lean<WebsiteDocument>();
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

    async listDomains(limit = 1000, workspaceId?: string): Promise<{ domain: string; pages: number }[]>{
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
        return !!doc;
    }

    async purge({ domain, all }: { domain?: string; all?: boolean }): Promise<number>{
        if(all){
            const result = await Website.deleteMany({});
            return result.deletedCount ?? 0;
        }
        if(domain){
            const pattern = new RegExp('^https?://([a-z0-9-]+\\.)*' + _.escapeRegExp(domain) + '(/|$)', 'i');
            const result = await Website.deleteMany({ url: pattern });
            return result.deletedCount ?? 0;
        }
        throw new RuntimeError(RequestError.ValidationFailed ?? 'Request::ValidationFailed', 400);
    }
}
