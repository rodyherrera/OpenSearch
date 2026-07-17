export interface PublicWorkspace{
    id: string;
    name: string;
    role: 'owner' | 'member';
    followExternal: boolean;
    starterPacks: string[];
}

export interface StarterPack{
    name: string;
    urlCount: number;
}

export interface CreateWorkspaceBody{
    name: string;
}

export interface UpdateWorkspaceBody{
    followExternal?: boolean;
    starterPacks?: string[];
}

export enum WorkspaceError{
    NotFound = 'Workspace::NotFound',
    Forbidden = 'Workspace::Forbidden',
    NameRequired = 'Workspace::NameRequired'
}
