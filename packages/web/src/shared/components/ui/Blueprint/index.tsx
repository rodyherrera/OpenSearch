import Crosshairs from '@/shared/components/ui/Crosshairs';
import type { ReactNode } from 'react';

interface CanvasProps{
    children: ReactNode;
}

/**
 * Full-bleed blueprint canvas: escapes the main content padding (px-8 pb-10)
 * so band rules span the entire content width. Fill it with Row bands.
 */
export const Canvas = ({ children }: CanvasProps) => (
    <div className='-mx-8 -mb-10 flex min-h-full flex-col'>{children}</div>
);

interface RowProps{
    children?: ReactNode;
    className?: string;
    grow?: boolean;
    // Band width — Firecrawl's blueprint steps per band (narrow picker, medium
    // card, wide results), so the vertical rails shift between bands.
    max?: string;
}

/**
 * One band of the blueprint grid: the horizontal hairline spans the full content
 * width while the centered column's rails and corner crosshairs mark the cell —
 * the signature Firecrawl framing.
 */
export const Row = ({ children, className = '', grow = false, max = 'max-w-4xl' }: RowProps) => (
    <div className={`relative border-b border-hairline ${grow ? 'flex-1' : ''}`}>
        <div className={`relative mx-auto h-full w-full border-x border-hairline ${max} ${className}`}>
            <Crosshairs />
            {children}
        </div>
    </div>
);
