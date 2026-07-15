import { useRef, useState } from 'react';
import { playgroundApi } from '@/modules/playground/api/api';
import type { Endpoint, CrawlStatus } from '@/modules/playground/contracts/playground';

const CRAWL_POLL_MS = 2000;
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

export interface PlaygroundRun{
    endpoint: Endpoint;
    url: string;
    limit: number;
    running: boolean;
    result: unknown;
    error: string | null;
    // Live status line while a crawl job is polling.
    note: string | null;
    setUrl: (value: string) => void;
    setLimit: (value: number) => void;
    setEndpoint: (endpoint: Endpoint) => void;
    run: () => Promise<void>;
}

const messageFrom = (error: unknown): string =>
    error instanceof Error ? error.message : 'Request failed';

export const usePlayground = (): PlaygroundRun => {
    const [endpoint, setEndpoint] = useState<Endpoint>('search');
    const [url, setUrl] = useState('');
    const [limit, setLimit] = useState(10);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const cancelled = useRef(false);

    // Poll a created crawl job to a terminal state, then resolve its results. Kept
    // here (not in the component) so the page stays declarative.
    const pollCrawl = async (id: string): Promise<void> => {
        for(;;){
            if(cancelled.current) return;
            const status: CrawlStatus = await playgroundApi.crawlStatus(id);
            setNote(`Crawl ${status.status} — ${status.total} page(s) so far…`);
            if(TERMINAL.has(status.status)){
                const results = await playgroundApi.crawlResults(id);
                setResult(results);
                setNote(`Crawl ${status.status} — ${results.total} page(s).`);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, CRAWL_POLL_MS));
        }
    };

    const run = async () => {
        cancelled.current = false;
        setRunning(true);
        setError(null);
        setResult(null);
        setNote(null);
        const value = url.trim();
        try{
            if(endpoint === 'search'){
                setResult(await playgroundApi.search(value, limit));
            }else if(endpoint === 'scrape'){
                setResult(await playgroundApi.scrape(value));
            }else if(endpoint === 'map'){
                setResult(await playgroundApi.map(value));
            }else{
                const job = await playgroundApi.crawlCreate(value, limit);
                setResult(job);
                await pollCrawl(job.id);
            }
        }catch(err){
            setError(messageFrom(err));
        }finally{
            setRunning(false);
        }
    };

    return { endpoint, url, limit, running, result, error, note, setUrl, setLimit, setEndpoint, run };
};
