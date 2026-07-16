const PATTERNS: Record<string, number[]> = {
    search: [
        0, 1, 1, 0,
        1, 0, 0, 1,
        1, 0, 0, 1,
        0, 1, 1, 1
    ],
    scrape: [
        1, 1, 1, 1,
        1, 1, 0, 0,
        1, 1, 1, 1,
        1, 1, 0, 0
    ],
    map: [
        1, 0, 0, 0,
        1, 1, 0, 0,
        0, 1, 1, 0,
        0, 0, 1, 1
    ],
    crawl: [
        1, 0, 0, 1,
        0, 1, 1, 0,
        0, 1, 1, 0,
        1, 0, 0, 1
    ]
};

interface DotGlyphProps{
    pattern: string;
    className?: string;
}

const STEP = 3.4;
const OFFSET = 1.9;

const DotGlyph = ({ pattern, className }: DotGlyphProps) => {
    const cells = PATTERNS[pattern] ?? PATTERNS.search;
    return (
        <svg viewBox='0 0 14 14' aria-hidden='true' className={className}>
            {cells.map((on, index) =>
                on ? (
                    <circle
                        key={index}
                        cx={OFFSET + (index % 4) * STEP}
                        cy={OFFSET + Math.floor(index / 4) * STEP}
                        r={1.1}
                        fill='currentColor'
                    />
                ) : null
            )}
        </svg>
    );
};

export default DotGlyph;
