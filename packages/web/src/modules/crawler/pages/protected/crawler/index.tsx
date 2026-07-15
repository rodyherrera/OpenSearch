import { useState } from 'react';
import { Button, Chip, Switch, NumberField, Label, FieldError, Spinner } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useForm } from '@/shared/hooks/forms/useForm';
import { useCrawlerControl } from '@/modules/crawler/hooks/useCrawlerControl';
import { TuningSchema } from '@/modules/crawler/contracts/crawler';
import type { CrawlerControlApi } from '@/modules/crawler/hooks/useCrawlerControl';
import type { Tuning, TuningInput } from '@/modules/crawler/contracts/crawler';

interface NumberFieldSpec{
    name: keyof TuningInput & string;
    label: string;
    min: number;
    step: number;
}

const NUMBER_FIELDS: NumberFieldSpec[] = [
    { name: 'concurrency', label: 'Concurrency', min: 1, step: 1 },
    { name: 'batchSize', label: 'Batch size', min: 1, step: 1 },
    { name: 'domainDelayMs', label: 'Domain delay (ms)', min: 0, step: 50 },
    { name: 'maxLinksPerPage', label: 'Max links / page', min: 1, step: 1 },
    { name: 'timeoutMs', label: 'Timeout (ms)', min: 1000, step: 500 }
];

const cardClass = 'rounded-xl border border-foreground/10 bg-surface-secondary p-5';

interface StatRowProps{
    label: string;
    value: number;
}

const StatRow = ({ label, value }: StatRowProps) => (
    <div className='flex items-center justify-between border-b border-foreground/5 py-1.5 last:border-b-0'>
        <span className='text-sm text-muted'>{label}</span>
        <span className='text-sm font-medium tabular-nums text-foreground'>{value.toLocaleString()}</span>
    </div>
);

interface TuningPanelProps{
    tuning: Tuning;
    saving: boolean;
    onSave: CrawlerControlApi['saveTuning'];
}

const TuningPanel = ({ tuning, saving, onSave }: TuningPanelProps) => {
    const [applied, setApplied] = useState(false);

    const form = useForm({
        schema: TuningSchema,
        initialValues: {
            concurrency: tuning.concurrency,
            batchSize: tuning.batchSize,
            domainDelayMs: tuning.domainDelayMs,
            maxLinksPerPage: tuning.maxLinksPerPage,
            timeoutMs: tuning.timeoutMs,
            respectRobots: tuning.respectRobots
        },
        onSubmit: async (values) => {
            setApplied(false);
            await onSave(values);
            setApplied(true);
        }
    });

    return (
        <section className={cardClass}>
            <h2 className='mb-1 text-sm font-semibold text-foreground'>Tuning</h2>
            <p className='mb-4 text-xs text-muted'>Adjust the crawl profile. Changes apply on the next tick.</p>

            <Form form={form} className='flex flex-col gap-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                    {NUMBER_FIELDS.map((spec) => (
                        <Field key={spec.name} form={form} name={spec.name}>
                            {(binding) => (
                                <NumberField
                                    value={typeof binding.value === 'number' ? binding.value : NaN}
                                    onChange={binding.onChange}
                                    onBlur={binding.onBlur}
                                    isInvalid={binding.isInvalid}
                                    isDisabled={saving}
                                    minValue={spec.min}
                                    step={spec.step}
                                    validationBehavior='aria'
                                    fullWidth
                                >
                                    <Label className='text-sm text-muted'>{spec.label}</Label>
                                    <NumberField.Group>
                                        <NumberField.DecrementButton aria-label={`Decrease ${spec.label}`}>
                                            −
                                        </NumberField.DecrementButton>
                                        <NumberField.Input />
                                        <NumberField.IncrementButton aria-label={`Increase ${spec.label}`}>
                                            +
                                        </NumberField.IncrementButton>
                                    </NumberField.Group>
                                    <FieldError>{binding.errorMessage}</FieldError>
                                </NumberField>
                            )}
                        </Field>
                    ))}
                </div>

                <Field form={form} name='respectRobots'>
                    {(binding) => (
                        <Switch
                            isSelected={Boolean(binding.value)}
                            onChange={binding.onChange}
                            isDisabled={saving}
                        >
                            <Switch.Content>
                                <Switch.Control>
                                    <Switch.Thumb />
                                </Switch.Control>
                                <Label className='text-sm text-foreground'>Respect robots.txt</Label>
                            </Switch.Content>
                        </Switch>
                    )}
                </Field>

                <div className='flex items-center gap-3'>
                    <Button
                        type='submit'
                        size='md'
                        className='bg-foreground text-background hover:bg-foreground/90'
                        isPending={saving}
                    >
                        Save tuning
                    </Button>
                    {applied ? (
                        <span className='text-sm text-success'>Tuning applied (takes effect next tick).</span>
                    ) : null}
                </div>
            </Form>
        </section>
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
            <div className={`${cardClass} flex flex-col items-start gap-3`}>
                <p className='text-sm text-danger'>
                    {error?.message ?? 'Unable to load crawler status.'}
                </p>
                <Button variant='secondary' size='sm' onPress={refresh}>
                    <RefreshCw className='size-4' />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6'>
            <header>
                <h1 className='text-lg font-semibold text-foreground'>Crawler control</h1>
                <p className='text-sm text-muted'>Pause, resume and tune the crawl in real time.</p>
            </header>

            <div className='grid gap-6 lg:grid-cols-2'>
                <section className={cardClass}>
                    <div className='mb-4 flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                            <h2 className='text-sm font-semibold text-foreground'>Status</h2>
                            <Chip color={status.paused ? 'danger' : 'success'} variant='soft' size='sm'>
                                {status.paused ? 'Paused' : 'Running'}
                            </Chip>
                        </div>
                        <Button
                            variant='secondary'
                            size='sm'
                            onPress={refresh}
                            isPending={loading}
                            aria-label='Refresh status'
                        >
                            <RefreshCw className='size-4' />
                        </Button>
                    </div>

                    <div className='flex flex-col'>
                        <StatRow label='Frontier size' value={status.frontier.size} />
                        <StatRow label='Seen' value={status.frontier.seen} />
                        <StatRow label='Domains' value={status.frontier.domains} />
                        <StatRow label='Stored' value={status.frontier.stored} />
                        <StatRow label='Pages / min' value={status.frontier.perMin} />
                    </div>
                </section>

                <section className={cardClass}>
                    <h2 className='mb-1 text-sm font-semibold text-foreground'>Pause / Resume</h2>
                    <p className='mb-4 text-xs text-muted'>
                        Toggle the crawl. Workers drain in-flight pages before halting.
                    </p>

                    <Switch
                        isSelected={!status.paused}
                        onChange={(running) => (running ? control.resume() : control.pause())}
                        isDisabled={control.toggling}
                    >
                        <Switch.Content>
                            <Switch.Control>
                                <Switch.Thumb />
                            </Switch.Control>
                            <Label className='text-sm text-foreground'>
                                {status.paused ? 'Crawl paused' : 'Crawl running'}
                            </Label>
                        </Switch.Content>
                    </Switch>
                </section>
            </div>

            <TuningPanel tuning={status.tuning} saving={control.saving} onSave={control.saveTuning} />
        </div>
    );
};

export default Crawler;
