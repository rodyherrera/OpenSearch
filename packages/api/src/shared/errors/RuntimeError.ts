export default class RuntimeError extends Error{
    statusCode: number;

    constructor(message: string, statusCode = 500){
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
