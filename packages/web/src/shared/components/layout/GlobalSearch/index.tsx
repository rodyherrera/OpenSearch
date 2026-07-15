import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

const DEBOUNCE_MS = 300;
const INDEX_PATH = '/pages';

// Listing routes filtered by this bar. On these pages typing writes ?q= live
// (URL-synced, so results are deep-linkable); anywhere else, submitting jumps
// to the index search on /pages.
const LISTINGS: Record<string, string> = {
    '/pages': 'Search pages…',
    '/domains': 'Filter domains…',
    '/seeds': 'Filter seeds…'
};

const isTypingTarget = (target: EventTarget | null): boolean => {
    if(!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const GlobalSearch = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [params] = useSearchParams();
    const listing = LISTINGS[pathname];
    const urlQuery = listing ? (params.get('q') ?? '') : '';
    const [value, setValue] = useState(urlQuery);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Follow the URL: back/forward while on a listing, clear when navigating away.
    useEffect(() => { setValue(urlQuery); }, [urlQuery]);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const palette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
            const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target);
            if(palette || slash){
                event.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const searchOf = (term: string): string => (term ? `?q=${encodeURIComponent(term)}` : '');

    const onChange = (next: string) => {
        setValue(next);
        clearTimeout(debounceRef.current);
        if(!listing) return;
        debounceRef.current = setTimeout(() => {
            navigate({ pathname, search: searchOf(next.trim()) }, { replace: true });
        }, DEBOUNCE_MS);
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        clearTimeout(debounceRef.current);
        navigate(
            { pathname: listing ? pathname : INDEX_PATH, search: searchOf(value.trim()) },
            { replace: Boolean(listing) }
        );
        inputRef.current?.blur();
    };

    return (
        <form onSubmit={onSubmit} role='search' className='relative w-full max-w-xl'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted' />
            <input
                ref={inputRef}
                type='search'
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => { if(event.key === 'Escape') inputRef.current?.blur(); }}
                placeholder={listing ?? 'Search the index…'}
                aria-label={listing ?? 'Search the index'}
                className='w-full rounded-lg border border-foreground/10 bg-surface-secondary py-1.5 pr-10 pl-8 text-sm text-foreground transition-colors placeholder:text-muted focus:border-foreground/30 focus:outline-none'
            />
            <kbd className='pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-foreground/10 px-1.5 font-sans text-[10px] text-muted'>/</kbd>
        </form>
    );
};

export default GlobalSearch;
