import type { CSSProperties } from 'react';

const OFFSET = -4.5;

const POSITIONS: CSSProperties[] = [
    { top: OFFSET, left: OFFSET },
    { top: OFFSET, right: OFFSET },
    { bottom: OFFSET, left: OFFSET },
    { bottom: OFFSET, right: OFFSET }
];

const Crosshairs = () => (
    <>
        {POSITIONS.map((style, index) => (
            <svg
                key={index}
                style={style}
                viewBox='0 0 9 9'
                aria-hidden='true'
                className='pointer-events-none absolute z-10 size-[9px] text-foreground/25'
            >
                <path d='M4.5 0v9M0 4.5h9' stroke='currentColor' strokeWidth='1' />
            </svg>
        ))}
    </>
);

export default Crosshairs;
