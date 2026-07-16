import { useEffect, useRef, useState } from 'react';
import { useRequest } from 'alova/client';
import { safeParse } from 'valibot';
import { Button, Switch, Spinner } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useForm } from '@/shared/hooks/forms/useForm';
import { crawlerApi } from '@/modules/crawler/api/api';
import { useCrawlerControl } from '@/modules/crawler/hooks/useCrawlerControl';
import { TuningSchema } from '@/modules/crawler/contracts/crawler';
import type { ReactNode } from 'react';
import type { FieldBinding } from '@/shared/contracts/form';
import type { CrawlerControlApi } from '@/modules/crawler/hooks/useCrawlerControl';
import type { Tuning, TuningInput } from '@/modules/crawler/contracts/crawler';

interface NumberFieldSpec{
    name: keyof TuningInput & string;
    label: string;
    hint: string;
    min: number;
    step: number;
}

const NUMBER_FIELDS: NumberFieldSpec[] = [
    { name: 'concurrency', label: 'Concurrency', hint: 'Parallel fetches per worker.', min: 1, step: 1 },
    { name: 'batchSize', label: 'Batch size', hint: 'URLs pulled from the frontier per tick.', min: 1, step: 1 },
    { name: 'domainDelayMs', label: 'Domain delay (ms)', hint: 'Politeness gap between hits to one host.', min: 0, step: 50 },
    { name: 'maxLinksPerPage', label: 'Max links / page', hint: 'Links enqueued from a single page.', min: 1, step: 1 },
    { name: 'timeoutMs', label: 'Timeout (ms)', hint: 'Per-request fetch timeout.', min: 1000, step: 500 }
];

const cardClass = 'rounded-xl border border-hairline bg-surface p-6';
const inputClass =
    'w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm tabular-nums text-foreground placeholder:text-muted transition-colors focus:border-foreground/30 focus:outline-none disabled:opacity-60';

// A section = bold heading (+ optional subtitle and right-aligned action) over a card.
interface SectionProps{
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}

const Section = ({ title, subtitle, action, children }: SectionProps) => (
    <section className='flex flex-col gap-4'>
        <div className='flex items-start justify-between gap-3'>
            <div className='flex flex-col gap-1'>
                <h2 className='text-base font-semibold text-foreground'>{title}</h2>
                {subtitle ? <p className='text-sm text-muted'>{subtitle}</p> : null}
            </div>
            {action ? <div className='flex shrink-0 items-center gap-1'>{action}</div> : null}
        </div>
        <div className={cardClass}>{children}</div>
    </section>
);

// Settings-style toggle: label + description on the left, switch on the right.
interface ToggleRowProps{
    title: string;
    description: string;
    isSelected: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

const ToggleRow = ({ title, description, isSelected, onChange, disabled }: ToggleRowProps) => (
    <div className='flex items-center justify-between gap-4'>
        <div className='flex flex-col'>
            <span className='text-sm font-semibold text-foreground'>{title}</span>
            <span className='text-xs text-muted'>{description}</span>
        </div>
        <Switch isSelected={isSelected} onChange={onChange} isDisabled={disabled} aria-label={title}>
            <Switch.Content>
                <Switch.Control>
                    <Switch.Thumb />
                </Switch.Control>
            </Switch.Content>
        </Switch>
    </div>
);

interface TuningFieldProps{
    spec: NumberFieldSpec;
    binding: FieldBinding<unknown>;
}

const TuningField = ({ spec, binding }: TuningFieldProps) => {
    const value = typeof binding.value === 'number' && !Number.isNaN(binding.value) ? String(binding.value) : '';
    return (
        <div className='flex flex-col gap-1.5'>
            <label htmlFor={spec.name} className='text-sm font-semibold text-foreground'>{spec.label}</label>
            <input
                id={spec.name}
                type='number'
                inputMode='numeric'
                min={spec.min}
                step={spec.step}
                value={value}
                aria-invalid={binding.isInvalid}
                onChange={(event) => binding.onChange(event.target.value === '' ? NaN : Number(event.target.value))}
                onBlur={() => binding.onBlur()}
                className={`${inputClass} ${binding.isInvalid ? 'border-danger/60' : ''}`}
            />
            {binding.isInvalid && binding.errorMessage ? (
                <span className='text-xs text-danger'>{binding.errorMessage}</span>
            ) : (
                <span className='text-xs text-muted'>{spec.hint}</span>
            )}
        </div>
    );
};

interface TuningPanelProps{
    tuning: Tuning;
    onSave: CrawlerControlApi['saveTuning'];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;

const SAVE_HINTS: Partial<Record<SaveState, { className: string; text: string }>> = {
    saving: { className: 'text-muted', text: 'Saving…' },
    saved: { className: 'text-success', text: 'Saved — applies next tick.' },
    error: { className: 'text-danger', text: 'Save failed.' }
};

const TuningPanel = ({ tuning, onSave }: TuningPanelProps) => {
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastSavedRef = useRef('');

    const initialValues = {
        concurrency: tuning.concurrency,
        batchSize: tuning.batchSize,
        domainDelayMs: tuning.domainDelayMs,
        maxLinksPerPage: tuning.maxLinksPerPage,
        timeoutMs: tuning.timeoutMs,
        respectRobots: tuning.respectRobots
    };
    if(!lastSavedRef.current) lastSavedRef.current = JSON.stringify(initialValues);

    const persist = async (values: TuningInput) => {
        const serialized = JSON.stringify(values);
        if(serialized === lastSavedRef.current) return;
        setSaveState('saving');
        try{
            await onSave(values);
            lastSavedRef.current = serialized;
            setSaveState('saved');
        }catch{
            setSaveState('error');
        }
    };

    const form = useForm({
        schema: TuningSchema,
        initialValues,
        onSubmit: persist
    });

    // Autosave: once the edited values parse as a valid profile, push them shortly
    // after the user stops typing. Invalid intermediates just wait for a fix.
    const persistRef = useRef(persist);
    persistRef.current = persist;
    const serializedValues = JSON.stringify(form.values);
    useEffect(() => {
        const result = safeParse(TuningSchema, JSON.parse(serializedValues));
        if(!result.success || JSON.stringify(result.output) === lastSavedRef.current) return;
        debounceRef.current = setTimeout(() => { void persistRef.current(result.output); }, AUTOSAVE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [serializedValues]);

    const hint = SAVE_HINTS[saveState];

    return (
        <Section
            title='Tuning'
            subtitle='Adjust the crawl profile. Changes save automatically and apply on the next tick.'
            action={hint ? <span className={`text-xs ${hint.className}`}>{hint.text}</span> : null}
        >
            <Form form={form} className='flex flex-col gap-6'>
                <div className='grid gap-5 sm:grid-cols-2'>
                    {NUMBER_FIELDS.map((spec) => (
                        <Field key={spec.name} form={form} name={spec.name}>
                            {(binding) => <TuningField spec={spec} binding={binding} />}
                        </Field>
                    ))}
                </div>

                <Field form={form} name='respectRobots'>
                    {(binding) => (
                        <ToggleRow
                            title='Respect robots.txt'
                            description="Honor each site's crawl directives."
                            isSelected={Boolean(binding.value)}
                            onChange={binding.onChange}
                        />
                    )}
                </Field>
            </Form>
        </Section>
    );
};

const DangerZone = () => {
    const purger = useRequest(crawlerApi.purgeIndex, { immediate: false });
    const [outcome, setOutcome] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

    const onPurge = async () => {
        if(!window.confirm('Purge the ENTIRE index? Every crawled page is deleted. This cannot be undone.')) return;
        setOutcome(null);
        try{
            const { deleted } = await purger.send();
            setOutcome({ tone: 'ok', text: `Purged the index — ${deleted.toLocaleString()} page(s) removed.` });
        }catch(error){
            setOutcome({ tone: 'error', text: error instanceof Error ? error.message : 'Something went wrong' });
        }
    };

    return (
        <Section title='Danger zone' subtitle='Destructive actions over the crawled index.'>
            <div className='flex items-center justify-between gap-4'>
                <div className='flex flex-col'>
                    <span className='text-sm font-semibold text-foreground'>Purge index</span>
                    <span className={`text-xs ${outcome ? (outcome.tone === 'error' ? 'text-danger' : 'text-success') : 'text-muted'}`}>
                        {outcome?.text ?? 'Delete every crawled page from the index.'}
                    </span>
                </div>
                <button
                    type='button'
                    onClick={() => void onPurge()}
                    disabled={purger.loading}
                    className='inline-flex shrink-0 items-center gap-2 rounded-full border border-danger/30 px-5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60'
                >
                    {purger.loading ? <Spinner size='sm' /> : null}
                    Purge all
                </button>
            </div>
        </Section>
    );
};

const Crawler = () => {
    const control = useCrawlerControl();
    const { status, loading, error, refresh } = control;

    if(!status){
        if(loading){
            return (
                <div className='flex min-h-64 items-center justify-center gap-3 text-muted'>
                    <Spinner />
                    <span className='text-sm'>Loading crawler status…</span>
                </div>
            );
        }

        return (
            <div className='mx-auto w-full max-w-3xl py-2'>
                <div className={`${cardClass} flex flex-col items-start gap-3`}>
                    <p className='text-sm text-danger'>{error?.message ?? 'Unable to load crawler status.'}</p>
                    <Button variant='secondary' size='sm' onPress={refresh}>
                        <RefreshCw className='size-4' />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-10 pt-10 pb-4'>
            <header className='flex flex-col gap-2'>
                <h1 className='text-4xl font-semibold tracking-tight text-foreground'>Crawler</h1>
                <p className='text-[15px] text-muted'>Control the crawl loop and tune its politeness profile.</p>
            </header>

            <Section title='Crawl state' subtitle='Workers drain in-flight pages before halting.'>
                <ToggleRow
                    title={status.paused ? 'Crawl paused' : 'Crawl running'}
                    description='Toggle the crawl on or off.'
                    isSelected={!status.paused}
                    onChange={(running) => (running ? control.resume() : control.pause())}
                    disabled={control.toggling}
                />
            </Section>

            <TuningPanel tuning={status.tuning} onSave={control.saveTuning} />

            <DangerZone />
        </div>
    );
};

export default Crawler;
