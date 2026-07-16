import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SearchField } from '@heroui/react';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export interface Column<T>{
    key: string;
    header: string;
    align?: 'left' | 'right';
    width?: string;
    sortable?: boolean;
    value?: (row: T) => string | number;
    cell?: (row: T) => ReactNode;
}

export interface TableSearch{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export interface DataTableProps<T>{
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    title?: string;
    subtitle?: string;
    search?: TableSearch;
    filters?: ReactNode;
    onRefresh?: () => void;
    actions?: ReactNode;
    notice?: ReactNode;
    loading?: boolean;
    error?: Error;
    emptyLabel?: string;
    initialSort?: { key: string; dir: SortDir };
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

const SKELETON_ROWS = Array.from({ length: 8 });
const DEBOUNCE_MS = 300;

const ToolbarSearch = ({ value, onChange, placeholder }: TableSearch) => {
    const [local, setLocal] = useState(value);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => { setLocal(value); }, [value]);
    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const handle = (next: string) => {
        setLocal(next);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onChange(next.trim()), DEBOUNCE_MS);
    };

    return (
        <SearchField
            aria-label={placeholder ?? 'Search'}
            value={local}
            onChange={handle}
            className='w-full sm:w-72'
        >
            <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={placeholder ?? 'Search…'} />
                <SearchField.ClearButton />
            </SearchField.Group>
        </SearchField>
    );
};

function DataTable<T>({
    columns,
    rows,
    rowKey,
    title,
    subtitle,
    search,
    filters,
    onRefresh,
    actions,
    notice,
    loading = false,
    error,
    emptyLabel = 'No Results',
    initialSort,
    hasMore = false,
    loadingMore = false,
    onLoadMore
}: DataTableProps<T>){
    const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const infiniteEnabled = Boolean(onLoadMore) && hasMore;
    useInfiniteScroll(sentinelRef, {
        hasMore: infiniteEnabled,
        loading: loading || loadingMore,
        onLoadMore: () => onLoadMore?.()
    });

    const sortedRows = useMemo(() => {
        const column = sort ? columns.find((entry) => entry.key === sort.key) : undefined;
        if(!sort || !column?.value) return rows;
        const factor = sort.dir === 'asc' ? 1 : -1;
        const getValue = column.value;
        return [...rows].sort((a, b) => {
            const av = getValue(a);
            const bv = getValue(b);
            if(av < bv) return -1 * factor;
            if(av > bv) return 1 * factor;
            return 0;
        });
    }, [rows, sort, columns]);

    const toggleSort = (column: Column<T>) => {
        if(!column.sortable) return;
        setSort((prev) => {
            if(prev?.key !== column.key) return { key: column.key, dir: 'desc' };
            return { key: column.key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
        });
    };

    const hasToolbar = Boolean(search || filters || onRefresh || actions);
    const showFooter = !loading && !error && sortedRows.length > 0;

    const MAX = 'max-w-6xl';

    return (
        <Canvas>
            {(title || subtitle) ? (
                <Row max={MAX} className='px-8 pt-14 pb-12'>
                    {title ? <h1 className='text-4xl font-semibold tracking-tight text-foreground'>{title}</h1> : null}
                    {subtitle ? <p className='mt-3 text-[15px] text-muted'>{subtitle}</p> : null}
                </Row>
            ) : null}

            {hasToolbar ? (
                <Row max={MAX} className='flex flex-wrap items-center gap-3 px-6 py-3.5'>
                    {search ? <ToolbarSearch {...search} /> : null}
                    {filters}
                    <div className='min-w-0 flex-1' />
                    {onRefresh ? (
                        <button
                            type='button'
                            onClick={onRefresh}
                            className='inline-flex items-center rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                        >
                            Refresh
                        </button>
                    ) : null}
                    {actions}
                </Row>
            ) : null}

            <Row max={MAX}>
                <table className='w-full table-fixed border-collapse text-sm'>
                    <thead>
                        <tr className='border-b border-hairline'>
                            {columns.map((column) => {
                                const active = sort?.key === column.key;
                                return (
                                    <th
                                        key={column.key}
                                        scope='col'
                                        onClick={() => toggleSort(column)}
                                        className={[
                                            'mono-label px-6 py-3.5 whitespace-nowrap',
                                            column.width ?? '',
                                            column.align === 'right' ? 'text-right' : 'text-left',
                                            active ? 'text-foreground' : 'text-muted/70',
                                            column.sortable ? 'cursor-pointer select-none transition-colors hover:text-foreground' : ''
                                        ].join(' ')}
                                    >
                                        <span className={`inline-flex items-center gap-1.5 ${column.align === 'right' ? 'flex-row-reverse' : ''}`}>
                                            {column.header}
                                            {column.sortable && active ? (
                                                sort.dir === 'desc'
                                                    ? <ArrowDown className='size-3.5' />
                                                    : <ArrowUp className='size-3.5' />
                                            ) : null}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            SKELETON_ROWS.map((_, rowIndex) => (
                                <tr key={rowIndex} className='border-b border-hairline last:border-b-0'>
                                    {columns.map((column) => (
                                        <td key={column.key} className='px-6 py-4'>
                                            <div className='h-5 w-2/3 animate-pulse rounded-md bg-foreground/[0.06]' />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className='px-6 py-20 text-center text-sm text-danger'>
                                    {error.message}
                                </td>
                            </tr>
                        ) : sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className='px-6 py-20 text-center text-sm font-medium text-foreground'>
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row) => (
                                <tr
                                    key={rowKey(row)}
                                    className='border-b border-hairline transition-colors last:border-b-0 hover:bg-foreground/[0.02]'
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={[
                                                'px-6 py-4 text-foreground',
                                                column.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                                            ].join(' ')}
                                        >
                                            {column.cell
                                                ? column.cell(row)
                                                : column.value
                                                    ? <span className='block truncate'>{column.value(row)}</span>
                                                    : null}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Row>

            {notice ? <Row max={MAX} className='px-6 py-3'>{notice}</Row> : null}

            {showFooter ? (
                <Row max={MAX} className='flex items-center justify-between gap-4 px-6 py-3.5'>
                    <span className='font-mono text-xs text-muted/70'>
                        {sortedRows.length.toLocaleString()} {sortedRows.length === 1 ? 'result' : 'results'}
                    </span>
                    {infiniteEnabled ? (
                        <div ref={sentinelRef} className='font-mono text-xs text-muted'>
                            {loadingMore ? 'Loading…' : ''}
                        </div>
                    ) : null}
                </Row>
            ) : null}

            <Row max={MAX} grow />
        </Canvas>
    );
}

export default DataTable;
