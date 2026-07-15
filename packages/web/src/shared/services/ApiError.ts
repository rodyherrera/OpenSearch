export class ApiError extends Error{
    readonly status: number;
    readonly body: unknown;

    constructor(status: number, message: string, body?: unknown, options?: ErrorOptions){
        super(message, options);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }

    get isNetworkError(): boolean{
        return this.status === 0;
    }
}
