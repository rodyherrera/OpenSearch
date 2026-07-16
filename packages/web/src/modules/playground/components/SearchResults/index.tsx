import { useState } from 'react';
import { FileText } from 'lucide-react';
import JsonView from '@/modules/playground/components/JsonView';
import CopyBar from '@/modules/playground/components/CopyBar';
import type { SearchResult } from '@/modules/playground/contracts/playground';

interface SearchResultsProps{
    results: SearchResult[];
    onScrape: (url: string) => void;
}

const hostOf = (url: string): string => {
    try{
        return new URL(url).host;
    }catch{
        return url;
    }
};

// Site favicon in a small bordered tile; falls back to Firecrawl's orange diamond.
const Favicon = ({ url }: { url: string }) => {
    const [failed, setFailed] = useState(false);

    return (
        <span className='grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface'>
            {failed ? (
                <span className='size-2.5 rotate-45 rounded-[2px] bg-accent' aria-hidden='true' />
            ) : (
                <img
                    src={`https://icons.duckduckgo.com/ip3/${hostOf(url)}.ico`}
                    onError={() => setFailed(true)}
                    alt=''
                    loading='lazy'
                    className='size-4'
                />
            )}
        </span>
    );
};

/**
 * Firecrawl-style ranked hits: favicon tile, "#N Title" with the rank in orange
 * mono, domain underneath, a "Scrape page" shortcut, then the raw JSON row as a
 * flat inset delimited by hairlines with a "Copy as JSON" strip below.
 */
const SearchResults = ({ results, onScrape }: SearchResultsProps) => (
    <div className='flex flex-col'>
        {results.map((result) => (
            <article key={`${result.position}-${result.url}`} className='flex flex-col border-t border-hairline first:border-t-0'>
                <header className='flex items-center justify-between gap-4 px-8 py-5'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <Favicon url={result.url} />
                        <div className='flex min-w-0 flex-col gap-0.5'>
                            <span className='truncate text-sm text-foreground'>
                                <span className='mr-1.5 font-mono text-accent'>#{result.position}</span>
                                <span className='font-medium'>{result.title || result.url}</span>
                            </span>
                            <span className='truncate text-xs text-muted'>{hostOf(result.url)}</span>
                        </div>
                    </div>
                    <button
                        type='button'
                        onClick={() => onScrape(result.url)}
                        className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5'
                    >
                        <FileText className='size-3.5' />
                        Scrape page
                    </button>
                </header>
                <div className='border-t border-hairline bg-foreground/[0.02]'>
                    <JsonView value={result} className='max-h-72 px-8 py-5' />
                </div>
                <CopyBar label='Copy as JSON' getText={() => JSON.stringify(result, null, 2)} />
            </article>
        ))}
    </div>
);

export default SearchResults;
