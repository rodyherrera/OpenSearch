import Sparkline from '@/modules/overview/components/Sparkline';

interface MetricCardProps{
    label: string;
    value: number | string;
    context?: string;
    series?: number[];
    live?: boolean;
}

// Numbers get thousands separators; pre-composed strings (e.g. `${perMin}/min`)
// pass through untouched.
const format = (value: number | string): string =>
    typeof value === 'number' ? value.toLocaleString() : value;

/**
 * Polar-style stat card: a muted label, a large value, a context line with a
 * live dot, and a full-bleed sparkline anchored to the card's bottom edge.
 */
const MetricCard = ({ label, value, context, series, live }: MetricCardProps) => {
    return (
        <div className='flex flex-col overflow-hidden rounded-xl border border-foreground/10'>
            <div className='flex flex-col gap-3 p-5'>
                <span className='text-xs font-medium text-muted'>{label}</span>
                <span className='text-3xl font-semibold tabular-nums text-foreground'>
                    {format(value)}
                </span>
                {context ? (
                    <span className='inline-flex items-center gap-2 text-xs text-muted'>
                        {live ? (
                            <span className='size-1.5 rounded-full bg-[var(--chart)]' aria-hidden='true' />
                        ) : null}
                        {context}
                    </span>
                ) : null}
            </div>
            {series ? <Sparkline data={series} height={56} /> : null}
        </div>
    );
};

export default MetricCard;
