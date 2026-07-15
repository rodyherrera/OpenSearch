interface SparklineProps{
    data: number[];
    height?: number;
    className?: string;
}

// Normalised viewBox width; the SVG stretches to its container via
// preserveAspectRatio='none' while non-scaling strokes stay crisp.
const VIEW_WIDTH = 100;
const POINT_CAP = 60;

/**
 * React SVG reimplementation of the vanilla dashboard's rolling area+line
 * speed chart (no chart library). Renders a filled area under a stroked
 * polyline, scaled to the min/max of the last ~60 points.
 */
const Sparkline = ({ data, height = 96, className }: SparklineProps) => {
    const points = data.slice(-POINT_CAP);
    const svgClassName = ['block text-primary', className].filter(Boolean).join(' ');

    // Need at least two points to draw a line; render an empty frame otherwise.
    if(points.length < 2){
        return (
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
                preserveAspectRatio='none'
                width='100%'
                height={height}
                className={svgClassName}
                role='img'
                aria-label='Crawl speed sparkline'
            />
        );
    }

    const lo = Math.min(...points);
    const hi = Math.max(...points);
    const range = hi - lo || 1;
    const pad = range * 0.15;
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
            aria-label='Crawl speed sparkline'
        >
            <path d={area} fill='currentColor' fillOpacity={0.1} stroke='none' />
            <polyline
                points={line.join(' ')}
                fill='none'
                stroke='currentColor'
                strokeWidth={2}
                strokeLinejoin='round'
                strokeLinecap='round'
                vectorEffect='non-scaling-stroke'
            />
        </svg>
    );
};

export default Sparkline;
