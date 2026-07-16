import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

// The index lives on /pages; the header bar is a global jump into it. Per-listing
// filtering is handled by each table's own toolbar search (bound to ?q=).
const INDEX_PATH = '/pages';

const isTypingTarget = (target: EventTarget | null): boolean => {
    if(!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // "/" or ⌘/Ctrl-K focuses the bar from anywhere outside a text field.
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

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        const term = value.trim();
        navigate({ pathname: INDEX_PATH, search: term ? `?q=${encodeURIComponent(term)}` : '' });
        inputRef.current?.blur();
    };

    return (
        <form onSubmit={onSubmit} role='search' className='relative w-64 shrink-0'>
            <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted' />
            <input
                ref={inputRef}
                type='search'
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => { if(event.key === 'Escape') inputRef.current?.blur(); }}
                placeholder='Search the index…'
                aria-label='Search the index'
                className='w-full rounded-lg border border-hairline bg-surface py-1.5 pr-10 pl-8 text-sm text-foreground transition-colors placeholder:text-muted focus:border-accent/50 focus:outline-none'
            />
            <kbd className='pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-hairline px-1.5 font-mono text-[10px] text-muted'>/</kbd>
        </form>
    );
};

export default GlobalSearch;
