import Sparkline from '@/modules/overview/components/Sparkline';

type MetricVariant = 'hero' | 'compact';

interface MetricCardProps{
    label: string;
    value: number | string;
    context?: string;
    series?: number[];
    live?: boolean;
    variant?: MetricVariant;
}

// Numbers get thousands separators; pre-composed strings (e.g. `${perMin}/min`)
// pass through untouched.
const format = (value: number | string): string =>
    typeof value === 'number' ? value.toLocaleString() : value;

const STYLES: Record<MetricVariant, { pad: string; value: string; chart: number }> = {
    hero: { pad: 'p-6', value: 'text-4xl', chart: 140 },
    compact: { pad: 'p-5', value: 'text-3xl', chart: 88 }
};

/**
 * Polar-style stat tile: a muted label, a large value, a context line with an
 * optional live dot, and a full-bleed sparkline anchored to the tile's bottom edge.
 * Rendered as a bare cell (no border/rounding) — the surrounding grid frames it
 * with hairline dividers. `tabular-nums` on the value keeps live counters from
 * jittering horizontally as digits change each tick.
 */
const MetricCard = ({ label, value, context, series, live, variant = 'compact' }: MetricCardProps) => {
    const style = STYLES[variant];

    return (
        <div className='flex min-h-full flex-col bg-surface'>
            <div className={`flex flex-col gap-2.5 ${style.pad}`}>
                <span className='mono-label text-muted/80'>{label}</span>
                <span className={`${style.value} font-semibold tabular-nums text-foreground`}>
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
            {series ? (
                <div className='mt-auto'>
                    <Sparkline data={series} height={style.chart} />
                </div>
            ) : null}
        </div>
    );
};

export default MetricCard;
