import { useId } from 'react';

interface SparklineProps{
    data: number[];
    height?: number;
    // Number of evenly-spaced internal vertical gridlines (recessive, solid hairline).
    gridlines?: number;
    className?: string;
}

// Normalised viewBox width; the SVG stretches to its container via
// preserveAspectRatio='none' while the non-scaling stroke stays crisp.
const VIEW_WIDTH = 100;
const POINT_CAP = 60;

// Recessive, solid, hairline gridlines drawn in the inherited text colour
// (text-foreground/10 on the root) so they stay one step off the surface — never
// the data hue, never dashed. Kept in both the empty and populated states.
const renderGridlines = (count: number, height: number) => {
    if(count <= 0) return null;
    return Array.from({ length: count }, (_, index) => {
        const gx = ((index + 1) / (count + 1)) * VIEW_WIDTH;
        return (
            <line
                key={index}
                x1={gx}
                y1={0}
                x2={gx}
                y2={height}
                stroke='currentColor'
                strokeWidth={1}
                vectorEffect='non-scaling-stroke'
            />
        );
    });
};

/**
 * Minimal single-series area+line sparkline (no chart library). A 2px line in the
 * accent hue over a soft ~12% wash of the same hue, with recessive solid hairline
 * gridlines behind it. Data colour is `var(--chart)`; gridlines inherit the muted
 * text colour, so the two channels never bleed into each other. Scaled to the
 * min/max of the last ~60 points.
 */
const Sparkline = ({ data, height = 64, gridlines = 0, className }: SparklineProps) => {
    const gradientId = useId();
    const points = data.slice(-POINT_CAP);
    const svgClassName = ['block w-full text-foreground/10', className].filter(Boolean).join(' ');

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
        return <svg {...commonProps}>{renderGridlines(gridlines, height)}</svg>;
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
        <svg {...commonProps}>
            <defs>
                <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='var(--chart)' stopOpacity={0.14} />
                    <stop offset='100%' stopColor='var(--chart)' stopOpacity={0} />
                </linearGradient>
            </defs>
            {renderGridlines(gridlines, height)}
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
