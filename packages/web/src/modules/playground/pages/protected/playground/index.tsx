import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Search, FileText, Map, Network, Code2, Check, Braces, Link2, ScrollText, Download, Share2 } from 'lucide-react';
import Crosshairs from '@/shared/components/ui/Crosshairs';
import EndpointPicker from '@/modules/playground/components/EndpointPicker';
import ResultMeta from '@/modules/playground/components/ResultMeta';
import SearchResults from '@/modules/playground/components/SearchResults';
import LinkList from '@/modules/playground/components/LinkList';
import JsonView from '@/modules/playground/components/JsonView';
import CopyBar from '@/modules/playground/components/CopyBar';
import { usePlayground } from '@/modules/playground/hooks/usePlayground';
import { buildCurl } from '@/modules/playground/utils/snippet';
import type { ComponentType, FormEvent, ReactNode } from 'react';
import type {
    Endpoint,
    SearchResponse,
    MapResponse,
    CrawlResults
} from '@/modules/playground/contracts/playground';

interface EndpointMeta{
    label: string;
    action: string;
    placeholder: string;
    icon: ComponentType<{ className?: string }>;
    isUrl: boolean;
    hasLimit: boolean;
}

const ENDPOINTS: Record<Endpoint, EndpointMeta> = {
    search: { label: 'Search', action: 'Start searching', placeholder: 'Search the index…', icon: Search, isUrl: false, hasLimit: true },
    scrape: { label: 'Scrape', action: 'Start scraping', placeholder: 'example.com', icon: FileText, isUrl: true, hasLimit: false },
    map: { label: 'Map', action: 'Start mapping', placeholder: 'example.com', icon: Map, isUrl: true, hasLimit: false },
    crawl: { label: 'Crawl', action: 'Start crawling', placeholder: 'example.com', icon: Network, isUrl: true, hasLimit: true }
};

const isEndpoint = (value: string | null): value is Endpoint =>
    value === 'search' || value === 'scrape' || value === 'map' || value === 'crawl';

const isSearchResponse = (result: unknown): result is SearchResponse =>
    Boolean(result) && typeof result === 'object' && Array.isArray((result as SearchResponse).results);

const isMapResponse = (result: unknown): result is MapResponse =>
    Boolean(result) && typeof result === 'object' && Array.isArray((result as MapResponse).links);

const isCrawlResults = (result: unknown): result is CrawlResults =>
    Boolean(result) && typeof result === 'object' && Array.isArray((result as CrawlResults).data);

const markdownOf = (result: unknown): string | null => {
    if(result && typeof result === 'object' && 'markdown' in result){
        const value = (result as { markdown: unknown }).markdown;
        if(typeof value === 'string' && value.length) return value;
    }
    return null;
};

const metadataOf = (result: unknown, key: string): string | null => {
    if(result && typeof result === 'object' && 'metadata' in result){
        const metadata = (result as { metadata: unknown }).metadata;
        if(metadata && typeof metadata === 'object'){
            const value = (metadata as Record<string, unknown>)[key];
            if(typeof value === 'string' && value.length) return value;
        }
    }
    return null;
};

const download = (filename: string, text: string, type = 'application/json'): void => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};

const ghostButton = 'inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5';

interface RowProps{
    children?: ReactNode;
    className?: string;
    grow?: boolean;
    // Band width: Firecrawl's blueprint steps — narrow picker, medium request
    // card, wide results — so the rails shift per band.
    max?: string;
}

/**
 * One band of the blueprint grid: the horizontal hairline spans the full content
 * width while the centered column's rails and corner crosshairs mark the cell —
 * the signature Firecrawl playground framing.
 */
const Row = ({ children, className = '', grow = false, max = 'max-w-4xl' }: RowProps) => (
    <div className={`relative border-b border-hairline ${grow ? 'flex-1' : ''}`}>
        <div className={`relative mx-auto h-full w-full border-x border-hairline ${max} ${className}`}>
            <Crosshairs />
            {children}
        </div>
    </div>
);

interface TabSpec{
    key: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
}

interface TabsProps{
    tabs: TabSpec[];
    active: string;
    onChange: (key: string) => void;
}

const Tabs = ({ tabs, active, onChange }: TabsProps) => (
    <div className='flex border-b border-hairline'>
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const on = tab.key === active;
            return (
                <button
                    key={tab.key}
                    type='button'
                    onClick={() => onChange(tab.key)}
                    className={`flex items-center gap-2 border-r border-hairline px-6 py-3.5 text-sm transition-colors ${
                        on ? 'font-medium text-foreground' : 'text-muted hover:text-foreground'
                    }`}
                >
                    <Icon className={`size-4 ${on ? 'text-accent' : ''}`} />
                    {tab.label}
                </button>
            );
        })}
    </div>
);

const DEFAULT_VIEW: Record<Endpoint, string> = {
    search: 'results',
    scrape: 'markdown',
    map: 'links',
    crawl: 'pages'
};

const Playground = () => {
    const pg = usePlayground();
    const [params, setParams] = useSearchParams();
    const endpointParam = params.get('endpoint');
    const endpoint: Endpoint = isEndpoint(endpointParam) ? endpointParam : 'search';
    const meta = ENDPOINTS[endpoint];

    const [submitted, setSubmitted] = useState<{ endpoint: Endpoint; value: string } | null>(null);
    const [view, setView] = useState(DEFAULT_VIEW[endpoint]);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);

    // The sidebar deep-links endpoints via ?endpoint=; keep the runner in sync.
    // A shared ?q= prefills the input (without auto-running).
    useEffect(() => {
        pg.setEndpoint(endpoint);
        setView(DEFAULT_VIEW[endpoint]);
        const q = params.get('q');
        if(q) pg.setUrl(q);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    const curl = useMemo(() => buildCurl(endpoint, pg.url, pg.limit), [endpoint, pg.url, pg.limit]);

    const selectEndpoint = (next: Endpoint) => setParams({ endpoint: next });

    const onChangeValue = (raw: string) => {
        // The https:// chip already spells the scheme out; strip it from pasted URLs.
        pg.setUrl(meta.isUrl ? raw.replace(/^https:\/\//i, '') : raw);
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if(!pg.url.trim()) return;
        setSubmitted({ endpoint, value: pg.url.trim() });
        setView(DEFAULT_VIEW[endpoint]);
        void pg.run();
    };

    const copyCode = async () => {
        await navigator.clipboard.writeText(curl);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1500);
    };

    // Permalink to this run: endpoint + query, prefilled on load.
    const copyShare = async () => {
        if(!submitted) return;
        const share = new URLSearchParams({ endpoint: submitted.endpoint, q: submitted.value });
        await navigator.clipboard.writeText(`${window.location.origin}/playground?${share.toString()}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 1500);
    };

    // Prefill the scrape playground from a search hit, Firecrawl-style.
    const scrapeFrom = (url: string) => {
        pg.setUrl(url.replace(/^https:\/\//i, ''));
        setSubmitted(null);
        setParams({ endpoint: 'scrape' });
    };

    const state = pg.running ? 'running' : pg.error ? 'error' : 'success';
    const showResults = submitted !== null;

    return (
        <div className='-mx-8 -mb-10 flex min-h-full flex-col'>
            {/* Endpoint picker band — narrow cell hugging the tab strip */}
            <Row max='max-w-xl' className='flex justify-center px-6 pt-7 pb-5'>
                <EndpointPicker endpoint={endpoint} onSelect={selectEndpoint} />
            </Row>

            {/* Request card — medium cell, card floats with soft elevation */}
            <Row max='max-w-2xl' className='px-6 py-12'>
                <form
                    onSubmit={onSubmit}
                    className='overflow-hidden rounded-xl border border-foreground/[0.05] bg-surface shadow-[0_16px_50px_-16px_rgba(0,0,0,0.65)]'
                >
                    <div className='flex items-center gap-1 px-4 py-1.5'>
                        {meta.isUrl ? (
                            <span className='shrink-0 rounded-md bg-foreground/[0.05] px-2 py-1 font-mono text-xs text-muted'>
                                https://
                            </span>
                        ) : null}
                        <input
                            value={pg.url}
                            onChange={(event) => onChangeValue(event.target.value)}
                            placeholder={meta.placeholder}
                            spellCheck={false}
                            className='w-full bg-transparent px-2 py-3.5 text-[15px] text-foreground placeholder:text-muted/70 focus:outline-none'
                        />
                    </div>
                    <div className='flex flex-wrap items-center gap-2 border-t border-foreground/[0.05] px-3 py-2.5'>
                        {meta.hasLimit ? (
                            <label className='flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[13px] text-muted'>
                                Limit:
                                <input
                                    type='number'
                                    min={1}
                                    value={pg.limit}
                                    onChange={(event) => pg.setLimit(Number(event.target.value))}
                                    aria-label='Limit'
                                    className='w-10 bg-transparent font-mono text-xs tabular-nums text-foreground focus:outline-none'
                                />
                            </label>
                        ) : null}
                        <div className='flex-1' />
                        <button type='button' onClick={() => void copyCode()} className={`${ghostButton} px-3 py-2`}>
                            {copiedCode ? <Check className='size-3.5 text-accent' /> : <Code2 className='size-3.5' />}
                            {copiedCode ? 'Copied' : 'Get code'}
                        </button>
                        <Button
                            type='submit'
                            size='sm'
                            isPending={pg.running}
                            className='inline-flex shrink-0 items-center rounded-lg bg-accent px-4 text-xs font-medium text-accent-foreground hover:bg-accent-hover'
                        >
                            {meta.action}
                        </Button>
                    </div>
                </form>
            </Row>

            {showResults ? (
                <>
                    {/* Query echo, with a Share permalink on the right */}
                    <Row className='flex items-center gap-2.5 px-6 py-5'>
                        <div className='flex-1' />
                        <meta.icon className='size-4 text-accent' />
                        <span className='truncate text-[15px] font-medium text-foreground'>
                            {submitted.value.replace(/^https?:\/\//i, '')}
                        </span>
                        <div className='flex flex-1 justify-end'>
                            <button type='button' onClick={() => void copyShare()} className={ghostButton}>
                                {copiedShare ? <Check className='size-3.5 text-accent' /> : <Share2 className='size-3.5' />}
                                {copiedShare ? 'Copied' : 'Share'}
                            </button>
                        </div>
                    </Row>

                    <Row>
                        <ResultMeta endpoint={submitted.endpoint} endpointLabel={meta.label} state={state} />
                    </Row>

                    {pg.error ? (
                        <Row className='px-8 py-6'>
                            <p className='rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger'>{pg.error}</p>
                        </Row>
                    ) : null}

                    {pg.note ? (
                        <Row className='px-8 py-4'>
                            <p className='font-mono text-xs text-muted'>{pg.note}</p>
                        </Row>
                    ) : null}

                    {!pg.error && pg.result != null ? (
                        <ResultBody
                            endpoint={submitted.endpoint}
                            result={pg.result}
                            view={view}
                            onView={setView}
                            onScrape={scrapeFrom}
                        />
                    ) : null}
                </>
            ) : null}

            {/* Bottom filler so the rails run the full height of the canvas. */}
            <Row grow />
        </div>
    );
};

interface ResultBodyProps{
    endpoint: Endpoint;
    result: unknown;
    view: string;
    onView: (view: string) => void;
    onScrape: (url: string) => void;
}

interface ResultsHeaderProps{
    count?: number;
    subtitle?: string;
    children?: ReactNode;
}

const ResultsHeader = ({ count, subtitle, children }: ResultsHeaderProps) => (
    <header className='flex items-end justify-between gap-4 px-8 pt-8 pb-6'>
        <div className='flex flex-col gap-1'>
            <h2 className='text-xl font-semibold tracking-tight text-foreground'>
                Results
                {typeof count === 'number' ? <span className='ml-2 font-normal text-muted'>({count.toLocaleString()})</span> : null}
            </h2>
            {subtitle ? <p className='text-sm text-muted'>{subtitle}</p> : null}
        </div>
        {children ? <div className='flex shrink-0 items-center gap-2'>{children}</div> : null}
    </header>
);

const ResultBody = ({ endpoint, result, view, onView, onScrape }: ResultBodyProps) => {
    const asJson = () => JSON.stringify(result, null, 2);

    if(endpoint === 'search' && isSearchResponse(result)){
        return (
            <>
                <Row>
                    <ResultsHeader count={result.results.length} subtitle='Top hits from the crawled index.'>
                        <button type='button' onClick={() => download('search-results.json', asJson())} className={ghostButton}>
                            <Download className='size-3.5' />
                            JSON
                        </button>
                    </ResultsHeader>
                </Row>
                <Row>
                    <SearchResults results={result.results} onScrape={onScrape} />
                </Row>
            </>
        );
    }

    if(endpoint === 'map' && isMapResponse(result)){
        return (
            <>
                <Row>
                    <ResultsHeader count={result.total} subtitle='Every URL discovered on the site.'>
                        <button type='button' onClick={() => download('map-links.json', asJson())} className={ghostButton}>
                            <Download className='size-3.5' />
                            JSON
                        </button>
                    </ResultsHeader>
                </Row>
                <Row>
                    <Tabs
                        tabs={[
                            { key: 'links', label: 'Links', icon: Link2 },
                            { key: 'json', label: 'JSON', icon: Braces }
                        ]}
                        active={view}
                        onChange={onView}
                    />
                    <div className='bg-foreground/[0.02]'>
                        {view === 'links' ? <LinkList links={result.links} /> : <JsonView value={result} className='max-h-96 px-8 py-5' />}
                    </div>
                    <CopyBar
                        label={view === 'links' ? 'Copy as string' : 'Copy as JSON'}
                        getText={() => (view === 'links' ? result.links.join('\n') : asJson())}
                    />
                </Row>
            </>
        );
    }

    if(endpoint === 'crawl' && isCrawlResults(result)){
        const pageLinks = result.data.map((page) => page.url);
        return (
            <>
                <Row>
                    <ResultsHeader count={result.total} subtitle='Pages captured by the crawl job.'>
                        <button type='button' onClick={() => download('crawl-results.json', asJson())} className={ghostButton}>
                            <Download className='size-3.5' />
                            JSON
                        </button>
                    </ResultsHeader>
                </Row>
                <Row>
                    <Tabs
                        tabs={[
                            { key: 'pages', label: 'Pages', icon: Link2 },
                            { key: 'json', label: 'JSON', icon: Braces }
                        ]}
                        active={view}
                        onChange={onView}
                    />
                    <div className='bg-foreground/[0.02]'>
                        {view === 'pages' ? <LinkList links={pageLinks} /> : <JsonView value={result} className='max-h-96 px-8 py-5' />}
                    </div>
                    <CopyBar label='Copy as JSON' getText={asJson} />
                </Row>
            </>
        );
    }

    const markdown = markdownOf(result);
    if(endpoint === 'scrape' && markdown){
        const title = metadataOf(result, 'title');
        const sourceUrl = metadataOf(result, 'sourceURL') ?? (result && typeof result === 'object' && 'url' in result ? String((result as { url: unknown }).url) : '');
        return (
            <>
                <Row>
                    <header className='flex items-end justify-between gap-4 px-8 pt-8 pb-6'>
                        <div className='flex min-w-0 flex-col gap-1.5'>
                            <h2 className='truncate text-2xl font-semibold tracking-tight text-foreground'>
                                {title ?? 'Scraped page'}
                            </h2>
                            <p className='truncate text-sm text-muted'>{sourceUrl.replace(/^https?:\/\//i, '')}</p>
                        </div>
                        <div className='flex shrink-0 items-center gap-2'>
                            <button type='button' onClick={() => download('scrape.json', asJson())} className={ghostButton}>
                                <Download className='size-3.5' />
                                JSON
                            </button>
                            <button type='button' onClick={() => download('scrape.md', markdown, 'text/markdown')} className={ghostButton}>
                                <Download className='size-3.5' />
                                Markdown
                            </button>
                        </div>
                    </header>
                </Row>
                <Row>
                    <Tabs
                        tabs={[
                            { key: 'markdown', label: 'Markdown', icon: ScrollText },
                            { key: 'json', label: 'JSON', icon: Braces }
                        ]}
                        active={view}
                        onChange={onView}
                    />
                    <div className='bg-foreground/[0.02]'>
                        {view === 'markdown' ? (
                            <pre className='max-h-[32rem] overflow-auto px-8 py-5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90'>
                                {markdown}
                            </pre>
                        ) : (
                            <JsonView value={result} className='max-h-[32rem] px-8 py-5' />
                        )}
                    </div>
                    <CopyBar
                        label={view === 'markdown' ? 'Copy as Markdown' : 'Copy as JSON'}
                        getText={() => (view === 'markdown' ? markdown : asJson())}
                    />
                </Row>
            </>
        );
    }

    // Fallback for shapes we don't special-case (e.g. crawl job just created).
    return (
        <>
            <Row>
                <ResultsHeader />
            </Row>
            <Row>
                <div className='bg-foreground/[0.02]'>
                    <JsonView value={result} className='max-h-96 px-8 py-5' />
                </div>
                <CopyBar label='Copy as JSON' getText={asJson} />
            </Row>
        </>
    );
};

export default Playground;
