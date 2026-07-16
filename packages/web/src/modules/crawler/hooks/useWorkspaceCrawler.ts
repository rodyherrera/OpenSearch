import { useEffect } from 'react';
import { useRequest } from 'alova/client';
import { crawlerApi } from '@/modules/crawler/api/api';
import { useWorkspaces } from '@/modules/workspaces/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/modules/workspaces/store/workspace';
import type { WorkspaceChange } from '@/modules/crawler/api/api';
import type { IndexedDomain } from '@/modules/domains/contracts/domain';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

export interface UseWorkspaceCrawler{
    active: Workspace | null;
    setFollowExternal: (on: boolean) => Promise<void>;
    domains: IndexedDomain[];
    changes: WorkspaceChange[];
    loading: boolean;
}

export const useWorkspaceCrawler = (): UseWorkspaceCrawler => {
    const { active, setFollowExternal } = useWorkspaces();
    const activeId = useWorkspaceStore((state) => state.activeId);
    const domains = useRequest(crawlerApi.domains, { immediate: false, force: true, initialData: { domains: [] } });
    const changes = useRequest(crawlerApi.changes, { immediate: false, force: true, initialData: { changes: [] } });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void domains.send(); void changes.send(); }, [activeId]);

    return {
        active,
        setFollowExternal,
        domains: domains.data?.domains ?? [],
        changes: changes.data?.changes ?? [],
        loading: domains.loading || changes.loading
    };
};
