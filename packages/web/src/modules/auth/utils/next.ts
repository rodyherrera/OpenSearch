export const safeNext = (next: string | null): string =>
    next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
