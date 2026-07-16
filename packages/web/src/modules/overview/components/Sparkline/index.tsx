import { useId } from 'react';

interface SparklineProps{
    data: number[];
    height?: number;
    className?: string;
}

const VIEW_WIDTH = 100;
const POINT_CAP = 60;

const Sparkline = ({ data, height = 72, className }: SparklineProps) => {
    const gradientId = useId();
    const points = data.slice(-POINT_CAP);
    const svgClassName = ['block w-full', className].filter(Boolean).join(' ');

    const commonProps = {
        viewBox: `0 0 ${VIEW_WIDTH} ${height}`,
        preserveAspectRatio: 'none' as const,
        width: '100%',
        height,
        className: svgClassName,
        role: 'img' as const,
        'aria-label': 'Metric trend'
    };

    if(points.length < 2){
        return <svg {...commonProps} />;
    }

    const lo = Math.min(...points);
    const hi = Math.max(...points);
    const range = hi - lo || 1;
    const pad = range * 0.08;
    const bottom = lo - pad;
    const span = range + pad * 2;
    const count = points.length;

    const x = (index: number): number => (index / (count - 1)) * VIEW_WIDTH;
    const y = (value: number): number => height - ((value - bottom) / span) * height;

    const line = points.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`);
    const area = `M0,${height} L${line.join(' L')} L${VIEW_WIDTH},${height} Z`;

    return (
        <svg {...commonProps}>
            <defs>
                <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='var(--chart)' stopOpacity={0.35} />
                    <stop offset='100%' stopColor='var(--chart)' stopOpacity={0.02} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} stroke='none' />
            <polyline
                points={line.join(' ')}
                fill='none'
                stroke='var(--chart)'
                strokeWidth={2}
                strokeLinejoin='round'
                strokeLinecap='round'
                vectorEffect='non-scaling-stroke'
            />
        </svg>
    );
};

export default Sparkline;
