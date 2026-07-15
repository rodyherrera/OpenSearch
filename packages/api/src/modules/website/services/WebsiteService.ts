import mongoose from 'mongoose';
import _ from 'lodash';
import { getDomain } from 'tldts';
import Website, { type WebsiteDocument } from '@/modules/website/models/Website';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { WebsitePageRecord, ScrapedRecord } from '@/modules/website/contracts/domain/website';

export default class WebsiteService{
    async bulkUpsert(records: WebsitePageRecord[]): Promise<number>{
        if(!records.length) return 0;
        const bulkOps = records.map(({ url, title, description, keywords, content, metaData }) => ({
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { url, domain: getDomain(url) ?? '', title, description, keywords, content, metaData } },
                upsert: true
            }
        }));
        await Website.bulkWrite(bulkOps, { ordered: false });
        return bulkOps.length;
    }

    async estimatedCount(): Promise<number>{
        return Website.estimatedDocumentCount();
    }

    // Upsert a fully-scraped page. Unlike bulkUpsert (discovery: $setOnInsert only),
    // this refreshes content/markdown/metadata on every call so a re-scrape updates
    // the cached copy and bumps updatedAt — that timestamp is the cache clock.
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

    // Read a single indexed page by exact URL, including markdown (which list/search
    // responses omit). Returns null when the page isn't in the index.
    async findByUrl(url: string): Promise<WebsiteDocument | null>{
        return Website.findOne({ url }).lean<WebsiteDocument>();
    }

    // Every indexed URL for a registrable domain, newest first. Feeds the /map
    // endpoint the pages we already know about without touching the network.
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

    // Registrable domains actually present in the index with their page counts,
    // busiest first. Documents that predate the domain field are excluded until
    // the boot-time backfill reaches them.
    async listDomains(limit = 1000): Promise<{ domain: string; pages: number }[]>{
        return Website.aggregate<{ domain: string; pages: number }>([
            { $match: { domain: { $exists: true, $ne: '' } } },
            { $group: { _id: '$domain', pages: { $sum: 1 } } },
            { $sort: { pages: -1 } },
            { $limit: limit },
            { $project: { _id: 0, domain: '$_id', pages: 1 } }
        ]);
    }

    // One-shot migration for documents written before the domain field existed.
    // Batched so a large index is never loaded into memory at once. URLs with no
    // registrable domain get '' so they are never re-scanned on the next boot.
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
