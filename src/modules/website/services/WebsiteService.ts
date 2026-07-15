import Website from '@/modules/website/models/Website';
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
}
