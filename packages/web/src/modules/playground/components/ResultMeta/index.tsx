import { CheckCircle2, XCircle, LoaderCircle } from 'lucide-react';
import DotGlyph from '@/shared/components/ui/DotGlyph';
import type { ComponentType } from 'react';

type RunState = 'running' | 'success' | 'error';

interface ResultMetaProps{
    endpoint: string;
    endpointLabel: string;
    state: RunState;
}

const STATUS: Record<RunState, { label: string; className: string; icon: ComponentType<{ className?: string }> }> = {
    running: { label: 'Running', className: 'text-muted', icon: LoaderCircle },
    success: { label: 'Success', className: 'text-foreground', icon: CheckCircle2 },
    error: { label: 'Failed', className: 'text-danger', icon: XCircle }
};

// Firecrawl's "Endpoint | Status" cells: plain muted labels, a pixel-dot glyph for
// the endpoint, and the status check in orange. Framing hairlines come from the
// surrounding blueprint row.
const ResultMeta = ({ endpoint, endpointLabel, state }: ResultMetaProps) => {
    const status = STATUS[state];
    const StatusIcon = status.icon;

    return (
        <div className='grid grid-cols-2'>
            <div className='flex flex-col gap-2.5 border-r border-hairline px-8 py-5'>
                <span className='text-sm text-muted'>Endpoint</span>
                <span className='flex items-center gap-2 text-sm text-foreground'>
                    <DotGlyph pattern={endpoint} className='size-3.5 text-accent' />
                    {endpointLabel}
                </span>
            </div>
            <div className='flex flex-col gap-2.5 px-8 py-5'>
                <span className='text-sm text-muted'>Status</span>
                <span className={`flex items-center gap-2 text-sm ${status.className}`}>
                    <StatusIcon
                        className={`size-4 ${state === 'success' ? 'text-accent' : ''} ${state === 'running' ? 'animate-spin' : ''}`}
                    />
                    {status.label}
                </span>
            </div>
        </div>
    );
};

export default ResultMeta;
