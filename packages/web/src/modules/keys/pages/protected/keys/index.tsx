import { useState } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { Canvas, Row } from '@/shared/components/ui/Blueprint';
import { useKeys } from '@/modules/keys/hooks/useKeys';
import type { FormEvent } from 'react';
import type { ApiKey, CreatedApiKey } from '@/modules/keys/contracts/key';

const formatWhen = (iso?: string): string =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

const masked = (key: ApiKey): string => `${key.prefix}••••••••••••••••••${key.last4}`;

const SKELETON_ROWS = Array.from({ length: 2 });

const Keys = () => {
    const { keys, loaded, creating, removing, create, remove } = useKeys();
    const modal = useOverlayState();
    const [name, setName] = useState('');
    const [created, setCreated] = useState<CreatedApiKey | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onCreate = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        try{
            const key = await create(name.trim() || 'Default');
            setCreated(key);
            setName('');
            setCopied(false);
            modal.open();
        }catch(err){
            setError(err instanceof Error ? err.message : 'Could not create key');
        }
    };

    const onCopy = async () => {
        if(!created) return;
        await navigator.clipboard.writeText(created.key);
        setCopied(true);
    };

    const onDelete = async (key: ApiKey) => {
        if(!window.confirm(`Revoke “${key.name}”? Requests using it will start failing immediately.`)) return;
        setError(null);
        try{
            await remove(key.id);
        }catch(err){
            setError(err instanceof Error ? err.message : 'Could not revoke key');
        }
    };

    return (
        <>
            <Canvas>
                <Row className='px-8 pt-16 pb-14'>
                    <h1 className='text-4xl font-semibold tracking-tight text-foreground'>API Keys</h1>
                    <p className='mt-3 text-[15px] text-muted'>
                        Create and manage API keys to authenticate with the public API
                    </p>
                </Row>

                <Row className='flex flex-wrap items-center justify-between gap-3 px-8 py-5'>
                    <h2 className='text-lg font-semibold tracking-tight text-foreground'>Your API Keys</h2>
                    <form onSubmit={onCreate} className='flex items-center gap-2'>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder='Key name'
                            className='w-40 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm placeholder:text-muted focus:border-accent/50 focus:outline-none'
                        />
                        <Button
                            type='submit'
                            size='sm'
                            isPending={creating}
                            className='inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover'
                        >
                            <Plus className='size-4' />
                            Create
                        </Button>
                    </form>
                </Row>

                <Row className='flex flex-col'>
                    {!loaded ? (
                        SKELETON_ROWS.map((_, index) => (
                            <div key={index} className='flex flex-col gap-3 border-b border-hairline px-8 py-7 last:border-b-0'>
                                <div className='h-4 w-24 animate-pulse rounded bg-foreground/10' />
                                <div className='h-11 w-full animate-pulse rounded-lg bg-foreground/10' />
                            </div>
                        ))
                    ) : keys.length === 0 ? (
                        <p className='px-8 py-12 text-sm text-muted'>
                            No API keys yet — create your first key to call /search, /scrape, /map and /crawl.
                        </p>
                    ) : (
                        keys.map((key) => (
                            <div key={key.id} className='flex flex-col gap-3 border-b border-hairline px-8 py-7 last:border-b-0'>
                                <span className='text-sm font-medium text-foreground'>{key.name}</span>
                                <div className='flex items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3'>
                                    <code className='min-w-0 flex-1 truncate font-mono text-sm text-foreground'>{masked(key)}</code>
                                    <button
                                        type='button'
                                        onClick={() => void onDelete(key)}
                                        disabled={removing}
                                        aria-label={`Revoke ${key.name}`}
                                        className='grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50'
                                    >
                                        <Trash2 className='size-4' />
                                    </button>
                                </div>
                                <span className='text-xs text-muted'>
                                    Created on {formatWhen(key.createdAt)}
                                    <span className='mx-2 text-muted/40'>·</span>
                                    Last used {formatWhen(key.lastUsedAt)}
                                    <span className='mx-2 text-muted/40'>·</span>
                                    <span className='font-mono tabular-nums'>{key.requestCount.toLocaleString()}</span> requests
                                </span>
                            </div>
                        ))
                    )}
                </Row>

                {error ? (
                    <Row className='px-8 py-5'>
                        <p className='text-sm text-danger'>{error}</p>
                    </Row>
                ) : null}

                <Row grow />
            </Canvas>

            <Modal isOpen={modal.isOpen} onOpenChange={modal.setOpen}>
                <Modal.Backdrop>
                    <Modal.Container size='md'>
                        <Modal.Dialog>
                            <Modal.Header>
                                <Modal.Heading className='text-lg font-medium text-foreground'>
                                    Copy your API key
                                </Modal.Heading>
                                <p className='mt-1 text-sm text-muted'>
                                    This is the only time the full key is shown. Store it somewhere safe.
                                </p>
                            </Modal.Header>
                            <Modal.Body className='flex flex-col gap-3'>
                                <div className='flex items-center gap-2 rounded-lg border border-hairline bg-surface p-3'>
                                    <code className='flex-1 truncate font-mono text-sm text-foreground'>{created?.key}</code>
                                    <button
                                        type='button'
                                        onClick={() => void onCopy()}
                                        className='grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-foreground/10 hover:text-foreground'
                                        aria-label='Copy key'
                                    >
                                        {copied ? <Check className='size-4 text-accent' /> : <Copy className='size-4' />}
                                    </button>
                                </div>
                            </Modal.Body>
                            <Modal.Footer className='flex items-center justify-end'>
                                <Button
                                    type='button'
                                    size='md'
                                    className='rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover'
                                    onPress={modal.close}
                                >
                                    Done
                                </Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </>
    );
};

export default Keys;
