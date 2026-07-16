import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyBarProps{
    label: string;
    getText: () => string;
}

const CopyBar = ({ label, getText }: CopyBarProps) => {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        await navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className='flex justify-end border-t border-hairline'>
            <div className='border-l border-hairline px-5 py-3'>
                <button
                    type='button'
                    onClick={() => void onCopy()}
                    className='inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5'
                >
                    {copied ? <Check className='size-3.5 text-accent' /> : <Copy className='size-3.5' />}
                    {copied ? 'Copied' : label}
                </button>
            </div>
        </div>
    );
};

export default CopyBar;
