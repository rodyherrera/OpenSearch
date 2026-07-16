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
 * Minimal single-series area+line sparkline (no chart library). A 2px line in the
 * accent hue over a vivid gradient wash of the same hue, anchored to the tile's
 * bottom edge so it reads as a filled trend rather than a floating line. Scaled to
 * the min/max of the last ~60 points.
 */
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
    // Small padding keeps the peak/valley off the very edge while still letting the
    // line fill most of the height (so the tile never looks empty).
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
