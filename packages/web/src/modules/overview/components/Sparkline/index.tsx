import { useId } from 'react';

interface SparklineProps{
    data: number[];
    height?: number;
    className?: string;
}

// Normalised viewBox width; the SVG stretches to its container via
// preserveAspectRatio='none' while the non-scaling stroke stays crisp.
const VIEW_WIDTH = 100;
const POINT_CAP = 60;

/**
 * Minimal area+line sparkline (no chart library). A 2px line over a soft vertical
 * gradient, coloured by the current text colour so a card can tint it via
 * `text-[var(--chart)]`. Scaled to the min/max of the last ~60 points.
 */
const Sparkline = ({ data, height = 64, className }: SparklineProps) => {
    const gradientId = useId();
    const points = data.slice(-POINT_CAP);
    const svgClassName = ['block w-full text-[var(--chart)]', className].filter(Boolean).join(' ');

    if(points.length < 2){
        return (
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
                preserveAspectRatio='none'
                width='100%'
                height={height}
                className={svgClassName}
                role='img'
                aria-label='Metric sparkline'
            />
        );
    }

    const lo = Math.min(...points);
    const hi = Math.max(...points);
    const range = hi - lo || 1;
    const pad = range * 0.2;
    const bottom = lo - pad;
    const span = range + pad * 2;
    const count = points.length;

    const x = (index: number): number => (index / (count - 1)) * VIEW_WIDTH;
    const y = (value: number): number => height - ((value - bottom) / span) * height;

    const line = points.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`);
    const area = `M0,${height} L${line.join(' L')} L${VIEW_WIDTH},${height} Z`;

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            preserveAspectRatio='none'
            width='100%'
            height={height}
            className={svgClassName}
            role='img'
            aria-label='Metric sparkline'
        >
            <defs>
                <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='currentColor' stopOpacity={0.22} />
                    <stop offset='100%' stopColor='currentColor' stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} stroke='none' />
            <polyline
                points={line.join(' ')}
                fill='none'
                stroke='currentColor'
                strokeWidth={1.75}
                strokeLinejoin='round'
                strokeLinecap='round'
                vectorEffect='non-scaling-stroke'
            />
        </svg>
    );
};

export default Sparkline;
