const toMs = (input: string | number): number => (typeof input === 'number' ? input : new Date(input).getTime());

export const ago = (input: string | number): string => {
    const seconds = Math.max(0, Math.round((Date.now() - toMs(input)) / 1000));
    if(seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if(minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if(hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

export const formatWhen = (input: string | number): string =>
    new Date(toMs(input)).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
