import mongoose from 'mongoose';
import Seed from '@/modules/seed/models/Seed';
import CrawlFrontier, { normalizeUrl, domainOf } from '@/modules/crawler/services/CrawlFrontier';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { PublicSeed, AddSeedsResult } from '@/modules/seed/contracts/domain/seed';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export default class SeedService{
    #frontier = new CrawlFrontier();

    // Persist the seeds as documents (deduped by URL) and push them into the crawl
    // frontier. Persistence and enqueueing are independent: a URL already seen by the
    // frontier still lands in the listing, and a normalized dup is never re-saved.
    async add(rawUrls: string[]): Promise<AddSeedsResult>{
        const normalized = [...new Set(
            (rawUrls ?? []).map(normalizeUrl).filter((url): url is string => url !== null)
        )];
        if(!normalized.length) return { saved: 0, enqueued: 0 };

        const bulkOps = normalized.map((url) => ({
            updateOne: {
                filter: { url },
                update: { $setOnInsert: { url, domain: domainOf(url) } },
                upsert: true
            }
        }));
        const result = await Seed.bulkWrite(bulkOps, { ordered: false });
        const enqueued = await this.#frontier.enqueue(normalized);

        return { saved: result.upsertedCount ?? 0, enqueued };
    }

    async list(page: number, limit: number): Promise<PublicSeed[]>{
        const safeLimit = Math.min(Math.max(limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const safePage = Math.max(page || 1, 1);
        const records = await Seed
            .find()
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit);
        return records.map((record) => record.toJSON() as PublicSeed);
    }

    async deleteById(id: string): Promise<boolean>{
        if(!mongoose.isValidObjectId(id)){
            throw new RuntimeError(RequestError.InvalidId ?? 'Request::InvalidId', 400);
        }
        const doc = await Seed.findByIdAndDelete(id);
        return !!doc;
    }
}
