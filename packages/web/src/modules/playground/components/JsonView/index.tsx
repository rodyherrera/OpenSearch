import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface JsonViewProps{
    value: unknown;
    className?: string;
}

// Above this size highlighting stops paying for itself; render plain text.
const MAX_HIGHLIGHT = 300_000;

// Key strings (lookahead for ":") first so they win over plain string values.
const TOKEN = /"(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const classOf = (token: string, source: string, end: number): string => {
    if(token.startsWith('"')){
        return /^\s*:/.test(source.slice(end)) ? 'text-foreground/75' : 'text-accent';
    }
    if(token === 'true' || token === 'false' || token === 'null') return 'text-accent';
    return 'text-foreground';
};

const highlight = (source: string): ReactNode[] => {
    if(source.length > MAX_HIGHLIGHT) return [source];
    const out: ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    TOKEN.lastIndex = 0;
    for(let match = TOKEN.exec(source); match; match = TOKEN.exec(source)){
        if(match.index > cursor){
            out.push(<span key={key++} className='text-muted'>{source.slice(cursor, match.index)}</span>);
        }
        const token = match[0];
        cursor = match.index + token.length;
        out.push(<span key={key++} className={classOf(token, source, cursor)}>{token}</span>);
    }
    if(cursor < source.length){
        out.push(<span key={key++} className='text-muted'>{source.slice(cursor)}</span>);
    }
    return out;
};

/**
 * Firecrawl-style JSON block: monospace, keys in soft foreground, string values
 * in the accent orange, punctuation muted.
 */
const JsonView = ({ value, className }: JsonViewProps) => {
    const nodes = useMemo(() => highlight(JSON.stringify(value, null, 2) ?? 'null'), [value]);

    return (
        <pre className={`overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-words ${className ?? ''}`}>
            {nodes}
        </pre>
    );
};

export default JsonView;
