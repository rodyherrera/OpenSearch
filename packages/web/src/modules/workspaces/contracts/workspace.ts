export interface Workspace{
    id: string;
    name: string;
    role: 'owner' | 'member';
    followExternal: boolean;
}

export interface CreateWorkspaceInput{
    name: string;
}
