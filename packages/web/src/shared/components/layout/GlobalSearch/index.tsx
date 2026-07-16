import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchField } from '@heroui/react';

// The index lives on /pages; the header bar is a global jump into it. Per-listing
// filtering is handled by each table's own toolbar search (bound to ?q=).
const INDEX_PATH = '/pages';

const isTypingTarget = (target: EventTarget | null): boolean => {
    if(!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const GlobalSearch = () => {
    const navigate = useNavigate();
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

    const onSubmit = (value: string) => {
        const term = value.trim();
        navigate({ pathname: INDEX_PATH, search: term ? `?q=${encodeURIComponent(term)}` : '' });
        inputRef.current?.blur();
    };

    return (
        <SearchField aria-label='Search the index' onSubmit={onSubmit} className='w-64 shrink-0'>
            <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input ref={inputRef} placeholder='Search the index…' />
                <SearchField.ClearButton />
            </SearchField.Group>
        </SearchField>
    );
};

export default GlobalSearch;
