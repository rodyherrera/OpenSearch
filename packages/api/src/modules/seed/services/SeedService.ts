import mongoose from 'mongoose';
import _ from 'lodash';
import Seed from '@/modules/seed/models/Seed';
import CrawlFrontier from '@/modules/fleet/services/CrawlFrontier';
import WorkspaceFrontier from '@/modules/fleet/services/WorkspaceFrontier';
import UrlNormalizer from '@/modules/fleet/services/UrlNormalizer';
import WebsiteService from '@/modules/website/services/WebsiteService';
import CrawlEventPublisher from '@/modules/fleet/services/CrawlEventPublisher';
import RuntimeError from '@/shared/errors/RuntimeError';
import { RequestError } from '@/shared/errors/RequestError';
import type { PublicSeed, AddSeedsResult } from '@/modules/seed/contracts/domain/seed';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export default class SeedService{
    #frontier = new CrawlFrontier();
    #workspaceFrontier = new WorkspaceFrontier();
    #publisher = new CrawlEventPublisher();
    #websites = new WebsiteService();

    async add(workspaceId: string, rawUrls: string[]): Promise<AddSeedsResult>{
        const normalized = [...new Set(
            (rawUrls ?? []).map(UrlNormalizer.normalizeUrl).filter((url): url is string => url !== null)
        )];
        if(!normalized.length) return { saved: 0, enqueued: 0 };

        const bulkOps = normalized.map((url) => ({
            updateOne: {
                filter: { workspaceId, url },
                update: { $setOnInsert: { workspaceId, url, domain: UrlNormalizer.domainOf(url) } },
                upsert: true
            }
        }));
        const result = await Seed.bulkWrite(bulkOps, { ordered: false });

        const domains = [...new Set(normalized.map(UrlNormalizer.domainOf).filter(Boolean))];
        await this.#workspaceFrontier.registerWorkspaceDomains(workspaceId, domains);
        void this.#websites.stampWorkspaceByDomains(domains, workspaceId);

        const enqueued = await this.#frontier.enqueueScoped(normalized, workspaceId);

        const saved = await Seed.find({ workspaceId, url: { $in: normalized } }).sort({ createdAt: -1 });
        void this.#publisher.publishSeedAdded(workspaceId, saved.map((doc) => doc.toJSON() as PublicSeed), Date.now());

        return { saved: result.upsertedCount ?? 0, enqueued };
    }

    async list(workspaceId: string, page: number, limit: number, q?: string): Promise<PublicSeed[]>{
        const safeLimit = Math.min(Math.max(limit || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const safePage = Math.max(page || 1, 1);
        const term = q?.trim();
        const pattern = term ? new RegExp(_.escapeRegExp(term), 'i') : null;
        const filter: Record<string, unknown> = { workspaceId };
        if(pattern) filter.$or = [{ url: pattern }, { domain: pattern }];
        const records = await Seed
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit);
        return records.map((record) => record.toJSON() as PublicSeed);
    }

    async deleteById(workspaceId: string, id: string): Promise<boolean>{
        if(!mongoose.isValidObjectId(id)){
            throw new RuntimeError(RequestError.InvalidId ?? 'Request::InvalidId', 400);
        }
        const doc = await Seed.findOneAndDelete({ _id: id, workspaceId });
        if(doc) void this.#publisher.publishRemoved(workspaceId, 'seed', { id: doc.id, url: doc.url }, Date.now());
        return !!doc;
    }
}
