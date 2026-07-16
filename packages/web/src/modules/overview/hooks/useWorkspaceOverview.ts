import { useEffect } from 'react';
import { useRequest } from 'alova/client';
import { domainsApi } from '@/modules/domains/api/api';
import { pagesApi } from '@/modules/pages/api/api';
import { crawlerApi } from '@/modules/crawler/api/api';
import { useWorkspaces } from '@/modules/workspaces/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';
import type { PublicWebsite } from '@/modules/pages/contracts/page';
import type { WorkspaceChange } from '@/modules/crawler/api/api';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

const RECENT = 8;

export interface UseWorkspaceOverview{
    active: Workspace | null;
    domains: IndexedDomain[];
    pages: PublicWebsite[];
    changes: WorkspaceChange[];
    pageCount: number;
    loading: boolean;
}

export const useWorkspaceOverview = (): UseWorkspaceOverview => {
    const { active } = useWorkspaces();
    const activeId = useWorkspaceStore((state) => state.activeId);
    const domains = useRequest(() => domainsApi.list('workspace'), { immediate: false, force: true, initialData: { domains: [] } });
    const pages = useRequest(() => pagesApi.list(1, RECENT, undefined, 'workspace'), { immediate: false, force: true, initialData: [] as PublicWebsite[] });
    const changes = useRequest(crawlerApi.changes, { immediate: false, force: true, initialData: { changes: [] } });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void domains.send(); void pages.send(); void changes.send(); }, [activeId]);

    const domainList = domains.data?.domains ?? [];
    return {
        active,
        domains: domainList,
        pages: pages.data ?? [],
        changes: changes.data?.changes ?? [],
        pageCount: domainList.reduce((sum, entry) => sum + entry.pages, 0),
        loading: domains.loading || pages.loading || changes.loading
    };
};
