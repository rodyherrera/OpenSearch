import { Flame } from 'lucide-react';
import Crosshairs from '@/shared/components/ui/Crosshairs';
import type { ReactNode } from 'react';

export const Band = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
    <div className={`relative border-b border-hairline ${className}`}>
        <Crosshairs />
        {children}
    </div>
);

// Full-bleed blueprint frame: a centered column with vertical rails, content split
// into horizontal bands over the grid — no floating card.
export const AuthShell = ({ children }: { children: ReactNode }) => (
    <main className='flex min-h-dvh flex-col bg-background'>
        <div className='mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col border-x border-hairline'>
            <Band className='flex-1' />
            <Band className='flex items-center justify-center gap-2.5 py-10'>
                <Flame className='size-7 text-accent' fill='currentColor' />
                <span className='text-2xl font-semibold tracking-tight text-foreground'>Crawlm</span>
            </Band>
            {children}
            <Band className='flex-1' />
        </div>
    </main>
);
