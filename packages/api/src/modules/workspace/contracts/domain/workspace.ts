export interface PublicWorkspace{
    id: string;
    name: string;
    role: 'owner' | 'member';
}

export interface CreateWorkspaceBody{
    name: string;
}

export enum WorkspaceError{
    NotFound = 'Workspace::NotFound',
    Forbidden = 'Workspace::Forbidden',
    NameRequired = 'Workspace::NameRequired'
}
