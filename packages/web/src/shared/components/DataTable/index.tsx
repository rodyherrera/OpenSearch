import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { TextField, Input } from '@heroui/react';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export interface Column<T>{
    key: string;
    header: string;
    align?: 'left' | 'right';
    // Optional fixed width (any Tailwind width class, e.g. 'w-44'). Columns without one
    // share the remaining space equally (the table uses a fixed layout).
    width?: string;
    sortable?: boolean;
    // Value used for default cell text and client-side sorting.
    value?: (row: T) => string | number;
    // Custom cell renderer; falls back to value() when omitted.
    cell?: (row: T) => ReactNode;
}

export interface DataTableSearch{
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
    onRefresh?: () => void;
    search?: DataTableSearch;
    // Optional controls rendered on the right side of the header (e.g. an "Add" button).
    actions?: ReactNode;
    loading?: boolean;
    error?: Error;
    emptyLabel?: string;
    initialSort?: { key: string; dir: SortDir };
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

const SKELETON_ROWS = Array.from({ length: 6 });

function DataTable<T>({
    columns,
    rows,
    rowKey,
    title,
    subtitle,
    onRefresh,
    search,
    actions,
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

    const hasHeader = Boolean(title || search || onRefresh || actions);

    return (
        <div className='flex w-full flex-col gap-4'>
            {hasHeader ? (
                <header className='flex items-start justify-between gap-4'>
                    <div className='flex flex-col'>
                        {title ? <h1 className='text-lg font-medium text-foreground'>{title}</h1> : null}
                        {subtitle ? <p className='mt-1 text-sm text-muted'>{subtitle}</p> : null}
                    </div>
                    <div className='flex shrink-0 items-center gap-3'>
                        {search ? (
                            <TextField
                                aria-label='Search'
                                value={search.value}
                                onChange={search.onChange}
                                className='w-64'
                            >
                                <div className='relative'>
                                    <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted' />
                                    <Input
                                        placeholder={search.placeholder ?? 'Search…'}
                                        className='w-full rounded-lg border border-foreground/10 bg-surface-secondary py-1.5 pr-3 pl-8 text-sm placeholder:text-muted focus:outline-none'
                                    />
                                </div>
                            </TextField>
                        ) : null}
                        {onRefresh ? (
                            <button
                                type='button'
                                onClick={onRefresh}
                                className='text-xs text-muted transition-colors hover:text-foreground'
                            >
                                Refresh
                            </button>
                        ) : null}
                        {actions}
                    </div>
                </header>
            ) : null}

            <div className='overflow-hidden rounded-2xl border border-foreground/10'>
                <table className='w-full table-fixed border-collapse text-sm'>
                    <thead>
                        <tr className='border-b border-foreground/10 bg-foreground/[0.02]'>
                            {columns.map((column) => {
                                const active = sort?.key === column.key;
                                return (
                                    <th
                                        key={column.key}
                                        scope='col'
                                        onClick={() => toggleSort(column)}
                                        className={[
                                            'px-6 py-3 font-medium whitespace-nowrap',
                                            column.width ?? '',
                                            column.align === 'right' ? 'text-right' : 'text-left',
                                            active ? 'text-foreground' : 'text-muted',
                                            column.sortable ? 'cursor-pointer select-none transition-colors hover:text-foreground' : ''
                                        ].join(' ')}
                                    >
                                        <span className='inline-flex items-center gap-1.5'>
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
                                <tr key={rowIndex} className='border-b border-foreground/5 last:border-b-0'>
                                    {columns.map((column) => (
                                        <td key={column.key} className='px-6 py-3.5'>
                                            <div className='h-4 w-2/3 animate-pulse rounded bg-foreground/10' />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : error ? (
                            <tr>
                                <td colSpan={columns.length} className='px-6 py-16 text-center text-sm text-danger'>
                                    {error.message}
                                </td>
                            </tr>
                        ) : sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className='px-6 py-16 text-center text-sm font-medium text-foreground'>
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row) => (
                                <tr
                                    key={rowKey(row)}
                                    className='border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]'
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={[
                                                'px-6 py-3.5 text-foreground',
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

                {infiniteEnabled && !loading ? (
                    <div
                        ref={sentinelRef}
                        className='border-t border-foreground/10 px-6 py-3 text-center text-xs text-muted'
                    >
                        {loadingMore ? 'Loading…' : ' '}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default DataTable;
