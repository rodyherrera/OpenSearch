export type Scope = 'workspace' | 'global';

interface ScopeToggleProps{
    value: Scope;
    onChange: (scope: Scope) => void;
}

const OPTIONS: { key: Scope; label: string }[] = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'global', label: 'Global' }
];

// Segmented switch between "this workspace's crawled slice" and "the whole shared
// index". Used on the Pages and Domains listings.
const ScopeToggle = ({ value, onChange }: ScopeToggleProps) => (
    <div className='inline-flex items-center rounded-lg border border-hairline p-0.5'>
        {OPTIONS.map((option) => (
            <button
                key={option.key}
                type='button'
                onClick={() => onChange(option.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    value === option.key ? 'bg-foreground/10 text-foreground' : 'text-muted hover:text-foreground'
                }`}
            >
                {option.label}
            </button>
        ))}
    </div>
);

export default ScopeToggle;
