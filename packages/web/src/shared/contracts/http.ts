export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface ApiResponse<T>{
    data: T;
}

export interface ApiErrorResponse{
    error: string;
}
