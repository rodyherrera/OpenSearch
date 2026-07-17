import type { DomainPageCount, PublicWebsite } from '@/modules/website/contracts/domain/website';
import type { WorkspaceChange } from '@/modules/crawler/contracts/domain/events';
import type { PublicSeed } from '@/modules/seed/contracts/domain/seed';

export interface WorkspaceCounts{
    pages: number;
    domains: number;
    changes: number;
}

export interface WorkspaceSnapshot{
    type: 'ws:snapshot';
    workspaceId: string;
    ts: number;
    counts: WorkspaceCounts;
    recentPages: PublicWebsite[];
    domains: DomainPageCount[];
    seeds: PublicSeed[];
    changes: WorkspaceChange[];
}
