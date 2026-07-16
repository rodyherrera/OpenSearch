export enum AuthError{
    InvalidCredentials = 'Auth::InvalidCredentials',
    Unauthorized = 'Auth::Unauthorized',
    InvalidToken = 'Auth::InvalidToken',
    EmailInUse = 'Auth::EmailInUse',
    WeakPassword = 'Auth::WeakPassword',
    InvalidEmail = 'Auth::InvalidEmail',
    RateLimited = 'Auth::RateLimited',
    Forbidden = 'Auth::Forbidden'
}
