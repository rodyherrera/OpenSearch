import mongoose from 'mongoose';
import { logger } from '@/core/utils/Logger';
import RuntimeError from '@/shared/errors/RuntimeError';
import User from '@/modules/auth/models/User';
import Seed from '@/modules/seed/models/Seed';
import Workspace, { type WorkspaceDocument } from '@/modules/workspace/models/Workspace';
import { PublicWorkspace, WorkspaceError } from '@/modules/workspace/contracts/domain/workspace';

const DEFAULT_NAME = 'Personal';

// Shape a document into the caller-facing view, resolving the requesting user's
// role within it.
const toPublic = (doc: WorkspaceDocument, userId: string): PublicWorkspace => {
    const membership = doc.members.find((member) => String(member.userId) === userId);
    return { id: doc.id, name: doc.name, role: membership?.role ?? 'member' };
};

export default class WorkspaceService{
    async listForUser(userId: string): Promise<PublicWorkspace[]>{
        const docs = await Workspace.find({ 'members.userId': userId }).sort({ createdAt: 1 });
        return docs.map((doc) => toPublic(doc, userId));
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

    // The requested workspace if the user belongs to it — otherwise null. Callers
    // decide whether a miss is a 404/403 or a fallback.
    async getIfMember(workspaceId: string, userId: string): Promise<WorkspaceDocument | null>{
        if(!mongoose.isValidObjectId(workspaceId)) return null;
        return Workspace.findOne({ _id: workspaceId, 'members.userId': userId });
    }

    // The user's default (oldest) workspace, used when no explicit workspace is set.
    async firstForUser(userId: string): Promise<WorkspaceDocument | null>{
        return Workspace.findOne({ 'members.userId': userId }).sort({ createdAt: 1 });
    }

    // The registrable domains this workspace has seeded — the scope for its private
    // slice of the shared index.
    async seedDomains(workspaceId: string): Promise<string[]>{
        const domains = await Seed.distinct('domain', { workspaceId });
        return domains.filter((domain): domain is string => Boolean(domain));
    }

    // Idempotent startup migration: reconcile Seed indexes (url → {workspaceId,url}),
    // give every user a default workspace, and adopt pre-tenancy seeds into it.
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
                logger.info(`workspace: adopted ${orphans} pre-tenancy seed(s)`, { workspace: target.id });
            }
        }
    }
}
