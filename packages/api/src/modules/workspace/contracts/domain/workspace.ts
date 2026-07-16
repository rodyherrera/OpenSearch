export interface PublicWorkspace{
    id: string;
    name: string;
    role: 'owner' | 'member';
    followExternal: boolean;
}

export interface CreateWorkspaceBody{
    name: string;
}

export interface UpdateWorkspaceBody{
    followExternal?: boolean;
}

export enum WorkspaceError{
    NotFound = 'Workspace::NotFound',
    Forbidden = 'Workspace::Forbidden',
    NameRequired = 'Workspace::NameRequired'
}
