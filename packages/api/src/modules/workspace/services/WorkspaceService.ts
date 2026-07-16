import mongoose from 'mongoose';
import { logger } from '@/core/utils/Logger';
import RuntimeError from '@/shared/errors/RuntimeError';
import User from '@/modules/auth/models/User';
import Seed from '@/modules/seed/models/Seed';
import WebsiteService from '@/modules/website/services/WebsiteService';
import CrawlFrontier from '@/modules/crawler/services/CrawlFrontier';
import Workspace, { type WorkspaceDocument } from '@/modules/workspace/models/Workspace';
import { PublicWorkspace, WorkspaceError } from '@/modules/workspace/contracts/domain/workspace';

const DEFAULT_NAME = 'Personal';

const toPublic = (doc: WorkspaceDocument, userId: string): PublicWorkspace => {
    const membership = doc.members.find((member) => String(member.userId) === userId);
    return {
        id: doc.id,
        name: doc.name,
        role: membership?.role ?? 'member',
        followExternal: doc.crawl?.followExternal ?? false
    };
};

export default class WorkspaceService{
    #frontier = new CrawlFrontier();

    async listForUser(userId: string): Promise<PublicWorkspace[]>{
        const docs = await Workspace.find({ 'members.userId': userId }).sort({ createdAt: 1 });
        return docs.map((doc) => toPublic(doc, userId));
    }

    async update(userId: string, workspaceId: string, followExternal: boolean): Promise<PublicWorkspace>{
        const doc = await this.getIfMember(workspaceId, userId);
        if(!doc) throw new RuntimeError(WorkspaceError.NotFound, 404);
        doc.crawl = { followExternal };
        await doc.save();
        await this.#frontier.setWorkspaceFollowExternal(workspaceId, followExternal);
        return toPublic(doc, userId);
    }

    async create(userId: string, name?: string): Promise<PublicWorkspace>{
        const trimmed = (name ?? '').trim();
        if(!trimmed) throw new RuntimeError(WorkspaceError.NameRequired, 400);
        const doc = await Workspace.create({
            name: trimmed,
            members: [{ userId, role: 'owner' }]
        });
        return toPublic(doc, userId);
    }

    async getIfMember(workspaceId: string, userId: string): Promise<WorkspaceDocument | null>{
        if(!mongoose.isValidObjectId(workspaceId)) return null;
        return Workspace.findOne({ _id: workspaceId, 'members.userId': userId });
    }

    async firstForUser(userId: string): Promise<WorkspaceDocument | null>{
        return Workspace.findOne({ 'members.userId': userId }).sort({ createdAt: 1 });
    }

    async seedDomains(workspaceId: string): Promise<string[]>{
        const domains = await Seed.distinct('domain', { workspaceId });
        return domains.filter((domain): domain is string => Boolean(domain));
    }

    async bootstrap(): Promise<void>{
        await Seed.syncIndexes().catch((error) => logger.warn('workspace: Seed.syncIndexes failed', { error: String(error) }));

        const users = await User.find().sort({ createdAt: 1 });
        for(const user of users){
            const has = await Workspace.countDocuments({ 'members.userId': user._id });
            if(!has){
                await Workspace.create({ name: DEFAULT_NAME, members: [{ userId: user._id, role: 'owner' }] });
                logger.info('workspace: created default workspace', { user: user.id });
            }
        }

        const orphans = await Seed.countDocuments({ workspaceId: { $exists: false } });
        if(orphans){
            const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
            const target = admin ? await this.firstForUser(admin.id) : null;
            if(target){
                await Seed.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: target._id } });
                const domains = (await Seed.distinct('domain', { workspaceId: target._id }))
                    .filter((domain): domain is string => Boolean(domain));
                const stamped = await new WebsiteService().stampWorkspaceByDomains(domains, target.id);
                logger.info(`workspace: adopted ${orphans} pre-tenancy seed(s), stamped ${stamped} page(s)`, { workspace: target.id });
            }
        }

        const followers = await Workspace.find({ 'crawl.followExternal': true });
        for(const workspace of followers){
            await this.#frontier.setWorkspaceFollowExternal(workspace.id, true);
        }
    }
}
