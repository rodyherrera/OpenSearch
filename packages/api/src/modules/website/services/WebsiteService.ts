import mongoose from 'mongoose';
import _ from 'lodash';
import Website from '@/modules/website/models/Website';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { WebsitePageRecord } from '@/modules/website/contracts/domain/website';

export default class WebsiteService{
    async bulkUpsert(records: WebsitePageRecord[]): Promise<number>{
        if(!records.length) return 0;
        const bulkOps = records.map(({ url, title, description, keywords, content, metaData }) => ({
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { url, title, description, keywords, content, metaData } },
                upsert: true
            }
        }));
        await Website.bulkWrite(bulkOps, { ordered: false });
        return bulkOps.length;
    }

    async estimatedCount(): Promise<number>{
        return Website.estimatedDocumentCount();
    }

    async recentUrls(limit: number): Promise<string[]>{
        const known = await Website.aggregate<{ url: string }>([
            { $sort: { createdAt: -1 } },
            { $limit: limit },
            { $project: { _id: 0, url: 1 } }
        ]);
        return known.map((doc) => doc.url);
    }

    async deleteById(id: string): Promise<boolean>{
        // Reject anything that isn't a valid ObjectId before hitting mongo
        if(!mongoose.isValidObjectId(id)){
            throw new RuntimeError(RequestError.InvalidId ?? 'Request::InvalidId', 400);
        }
        const doc = await Website.findByIdAndDelete(id);
        return !!doc;
    }

    async purge({ domain, all }: { domain?: string; all?: boolean }): Promise<number>{
        // Wipe the whole index when explicitly requested
        if(all){
            const result = await Website.deleteMany({});
            return result.deletedCount ?? 0;
        }
        // Otherwise scope the delete to a single domain (and its subdomains)
        if(domain){
            const pattern = new RegExp('^https?://([a-z0-9-]+\\.)*' + _.escapeRegExp(domain) + '(/|$)', 'i');
            const result = await Website.deleteMany({ url: pattern });
            return result.deletedCount ?? 0;
        }
        throw new RuntimeError(RequestError.ValidationFailed ?? 'Request::ValidationFailed', 400);
    }
}
