interface MetricCardProps{
    label: string;
    value: number | string;
    sub?: string;
}

// Numbers get thousands separators; pre-composed strings (e.g. `${perMin}/min`)
// pass through untouched.
const format = (value: number | string): string =>
    typeof value === 'number' ? value.toLocaleString() : value;

const MetricCard = ({ label, value, sub }: MetricCardProps) => {
    return (
        <div className='rounded-lg border border-foreground/10 bg-surface-secondary p-4'>
            <div className='text-xs text-muted uppercase tracking-wide'>{label}</div>
            <div className='mt-1 text-2xl font-semibold text-foreground tabular-nums'>
                {format(value)}
            </div>
            {sub ? <div className='mt-1 text-xs text-muted'>{sub}</div> : null}
        </div>
    );
};

export default MetricCard;
