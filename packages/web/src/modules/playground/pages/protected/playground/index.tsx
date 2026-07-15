import { useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import { Play, Copy, Check } from 'lucide-react';
import { usePlayground } from '@/modules/playground/hooks/usePlayground';
import { buildCurl } from '@/modules/playground/utils/snippet';
import type { FormEvent } from 'react';
import type { Endpoint } from '@/modules/playground/contracts/playground';

const ENDPOINTS: { key: Endpoint; label: string; hint: string }[] = [
    { key: 'search', label: 'Search', hint: 'Query the crawled index.' },
    { key: 'scrape', label: 'Scrape', hint: 'Fetch one URL as clean markdown.' },
    { key: 'map', label: 'Map', hint: 'Enumerate a site’s URLs.' },
    { key: 'crawl', label: 'Crawl', hint: 'Crawl a whole site into markdown.' }
];

const inputClass = 'w-full rounded-lg border border-foreground/10 bg-surface-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-foreground/30 focus:outline-none';

// Pull a markdown string out of whichever result shape we got, so the panel can offer
// a rendered-markdown view when there is one.
const markdownOf = (result: unknown): string | null => {
    if(result && typeof result === 'object' && 'markdown' in result){
        const value = (result as { markdown: unknown }).markdown;
        if(typeof value === 'string' && value.length) return value;
    }
    return null;
};

const Playground = () => {
    const pg = usePlayground();
    const [view, setView] = useState<'json' | 'markdown'>('json');
    const [copied, setCopied] = useState(false);

    const curl = useMemo(() => buildCurl(pg.endpoint, pg.url, pg.limit), [pg.endpoint, pg.url, pg.limit]);
    const markdown = markdownOf(pg.result);
    const isSearch = pg.endpoint === 'search';

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        void pg.run();
    };

    const copyCurl = async () => {
        await navigator.clipboard.writeText(curl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-6 py-2'>
            <header className='flex flex-col gap-1'>
                <h1 className='text-lg font-medium text-foreground'>Playground</h1>
                <p className='text-sm text-muted'>Try the developer API. Authenticated with your session — mint a key on the API Keys page.</p>
            </header>

            <nav className='flex gap-1 border-b border-foreground/10'>
                {ENDPOINTS.map((item) => (
                    <button
                        key={item.key}
                        type='button'
                        onClick={() => pg.setEndpoint(item.key)}
                        className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                            pg.endpoint === item.key
                                ? 'border-foreground font-medium text-foreground'
                                : 'border-transparent text-muted hover:text-foreground'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <form onSubmit={onSubmit} className='flex flex-col gap-3'>
                <p className='text-sm text-muted'>{ENDPOINTS.find((e) => e.key === pg.endpoint)?.hint}</p>
                <div className='flex items-center gap-2'>
                    <input
                        value={pg.url}
                        onChange={(event) => pg.setUrl(event.target.value)}
                        placeholder={isSearch ? 'Search the index…' : 'https://example.com'}
                        className={inputClass}
                    />
                    {(isSearch || pg.endpoint === 'crawl') ? (
                        <input
                            type='number'
                            min={1}
                            value={pg.limit}
                            onChange={(event) => pg.setLimit(Number(event.target.value))}
                            aria-label='Limit'
                            className='w-24 rounded-lg border border-foreground/10 bg-surface-secondary px-3 py-2 text-sm tabular-nums text-foreground focus:border-foreground/30 focus:outline-none'
                        />
                    ) : null}
                    <Button
                        type='submit'
                        size='md'
                        isPending={pg.running}
                        className='inline-flex shrink-0 items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90'
                    >
                        <Play className='size-4' />
                        Run
                    </Button>
                </div>
            </form>

            <section className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium text-muted'>cURL</span>
                    <button
                        type='button'
                        onClick={() => void copyCurl()}
                        className='inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground'
                    >
                        {copied ? <Check className='size-3.5 text-success' /> : <Copy className='size-3.5' />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <pre className='overflow-x-auto rounded-lg border border-foreground/10 bg-surface-secondary p-3 font-mono text-xs text-foreground'>{curl}</pre>
            </section>

            {pg.error ? <p className='text-sm text-danger'>{pg.error}</p> : null}
            {pg.note ? <p className='text-sm text-muted'>{pg.note}</p> : null}

            {pg.result != null ? (
                <section className='flex flex-col gap-2'>
                    <div className='flex items-center gap-1'>
                        <span className='mr-2 text-xs font-medium text-muted'>Result</span>
                        {markdown ? (
                            <>
                                <ViewTab active={view === 'markdown'} onClick={() => setView('markdown')} label='Markdown' />
                                <ViewTab active={view === 'json'} onClick={() => setView('json')} label='JSON' />
                            </>
                        ) : null}
                    </div>
                    <pre className='max-h-[28rem] overflow-auto rounded-lg border border-foreground/10 bg-surface-secondary p-4 font-mono text-xs leading-relaxed text-foreground'>
                        {markdown && view === 'markdown' ? markdown : JSON.stringify(pg.result, null, 2)}
                    </pre>
                </section>
            ) : null}
        </div>
    );
};

interface ViewTabProps{
    active: boolean;
    onClick: () => void;
    label: string;
}

const ViewTab = ({ active, onClick, label }: ViewTabProps) => (
    <button
        type='button'
        onClick={onClick}
        className={`rounded-md px-2 py-1 text-xs transition-colors ${
            active ? 'bg-foreground/10 font-medium text-foreground' : 'text-muted hover:text-foreground'
        }`}
    >
        {label}
    </button>
);

export default Playground;
