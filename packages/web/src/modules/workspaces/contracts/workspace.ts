export interface Workspace{
    id: string;
    name: string;
    role: 'owner' | 'member';
}

export interface CreateWorkspaceInput{
    name: string;
}
