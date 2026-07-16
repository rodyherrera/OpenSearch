import DotGlyph from '@/shared/components/ui/DotGlyph';
import type { Endpoint } from '@/modules/playground/contracts/playground';

interface EndpointPickerProps{
    endpoint: Endpoint;
    onSelect: (endpoint: Endpoint) => void;
}

interface PickerItem{
    key: Endpoint;
    label: string;
}

interface PickerGroup{
    label: string;
    items: PickerItem[];
}

// Firecrawl groups its endpoint tabs under tiny category headings, with pixel-dot
// glyphs and hairline separators between every tab.
const GROUPS: PickerGroup[] = [
    { label: 'Discover', items: [{ key: 'search', label: 'Search' }] },
    { label: 'Extract', items: [{ key: 'scrape', label: 'Scrape' }] },
    {
        label: 'Crawl',
        items: [
            { key: 'map', label: 'Map' },
            { key: 'crawl', label: 'Crawl' }
        ]
    }
];

const EndpointPicker = ({ endpoint, onSelect }: EndpointPickerProps) => (
    <div className='flex items-end'>
        {GROUPS.map((group, index) => {
            const first = index === 0;
            const last = index === GROUPS.length - 1;
            return (
                <div key={group.label} className='flex flex-col items-center gap-2.5'>
                    <span className='mono-label text-[10px] tracking-[0.14em] text-muted/50'>{group.label}</span>
                    <div
                        className={[
                            'flex overflow-hidden border-y border-hairline bg-surface',
                            first ? 'rounded-l-lg border-l' : '',
                            last ? 'rounded-r-lg border-r' : ''
                        ].join(' ')}
                    >
                        {group.items.map((item, itemIndex) => {
                            const active = endpoint === item.key;
                            const firstOverall = index === 0 && itemIndex === 0;
                            return (
                                <button
                                    key={item.key}
                                    type='button'
                                    onClick={() => onSelect(item.key)}
                                    className={`flex h-9 items-center gap-2 px-4 text-[13px] transition-colors ${
                                        firstOverall ? '' : 'border-l border-hairline'
                                    } ${
                                        active
                                            ? 'bg-foreground/[0.04] font-medium text-foreground'
                                            : 'text-muted hover:text-foreground'
                                    }`}
                                >
                                    <DotGlyph pattern={item.key} className={`size-3.5 ${active ? 'text-accent' : 'text-muted/70'}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </div>
);

export default EndpointPicker;
