import { alova } from '@/app/alova';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';

export interface WorkspaceChange{
    url: string;
    at: number;
}

// Workspace-scoped crawler view. Global crawl controls are operator-only and no
// longer exposed in the dashboard.
export const crawlerApi = {
    domains: () => alova.Get<{ domains: IndexedDomain[] }>('/website/domains', { params: { scope: 'workspace' } }),
    changes: () => alova.Get<{ changes: WorkspaceChange[] }>('/website/changes')
};
