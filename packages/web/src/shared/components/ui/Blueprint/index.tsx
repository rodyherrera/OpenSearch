import Crosshairs from '@/shared/components/ui/Crosshairs';
import type { ReactNode } from 'react';

interface CanvasProps{
    children: ReactNode;
}

export const Canvas = ({ children }: CanvasProps) => (
    <div className='-mx-8 -mb-10 flex min-h-full flex-col'>{children}</div>
);

interface RowProps{
    children?: ReactNode;
    className?: string;
    grow?: boolean;
    max?: string;
}

export const Row = ({ children, className = '', grow = false, max = 'max-w-4xl' }: RowProps) => (
    <div className={`relative border-b border-hairline ${grow ? 'flex-1' : ''}`}>
        <div className={`relative mx-auto h-full w-full border-x border-hairline ${max} ${className}`}>
            <Crosshairs />
            {children}
        </div>
    </div>
);
