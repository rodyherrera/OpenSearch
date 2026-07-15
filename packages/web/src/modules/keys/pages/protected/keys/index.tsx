import { useState } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import DataTable from '@/shared/components/DataTable';
import { useKeys } from '@/modules/keys/hooks/useKeys';
import type { FormEvent } from 'react';
import type { Column } from '@/shared/components/DataTable';
import type { ApiKey, CreatedApiKey } from '@/modules/keys/contracts/key';

const formatWhen = (iso?: string): string =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

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

    const columns: Column<ApiKey>[] = [
        {
            key: 'name',
            header: 'Name',
            value: (row) => row.name,
            cell: (row) => <span className='block truncate font-medium text-foreground'>{row.name}</span>
        },
        {
            key: 'prefix',
            header: 'Key',
            cell: (row) => (
                <span className='font-mono text-xs text-muted'>{row.prefix}…{row.last4}</span>
            )
        },
        {
            key: 'requestCount',
            header: 'Requests',
            width: 'w-28',
            align: 'right',
            sortable: true,
            value: (row) => row.requestCount,
            cell: (row) => row.requestCount.toLocaleString()
        },
        {
            key: 'lastUsedAt',
            header: 'Last used',
            width: 'w-44',
            align: 'right',
            sortable: true,
            value: (row) => row.lastUsedAt ?? '',
            cell: (row) => <span className='text-muted'>{formatWhen(row.lastUsedAt)}</span>
        },
        {
            key: 'actions',
            header: '',
            width: 'w-16',
            align: 'right',
            cell: (row) => (
                <button
                    type='button'
                    onClick={() => void onDelete(row)}
                    disabled={removing}
                    aria-label={`Revoke ${row.name}`}
                    className='text-muted transition-colors hover:text-danger disabled:opacity-50'
                >
                    <Trash2 className='size-4' />
                </button>
            )
        }
    ];

    return (
        <div className='flex flex-col gap-3'>
            <DataTable
                title='API Keys'
                subtitle='Authenticate the public /search, /scrape, /map and /crawl API.'
                columns={columns}
                rows={keys}
                rowKey={(row) => row.id}
                loading={!loaded}
                emptyLabel='No API keys yet'
                initialSort={{ key: 'lastUsedAt', dir: 'desc' }}
                actions={
                    <form onSubmit={onCreate} className='flex items-center gap-2'>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder='Key name'
                            className='w-40 rounded-lg border border-foreground/10 bg-surface-secondary px-3 py-1.5 text-sm placeholder:text-muted focus:border-foreground/30 focus:outline-none'
                        />
                        <Button
                            type='submit'
                            size='sm'
                            isPending={creating}
                            className='inline-flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90'
                        >
                            <Plus className='size-4' />
                            Create
                        </Button>
                    </form>
                }
            />
            {error ? <p className='text-sm text-danger'>{error}</p> : null}

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
                                <div className='flex items-center gap-2 rounded-lg border border-foreground/10 bg-surface-secondary p-3'>
                                    <code className='flex-1 truncate font-mono text-sm text-foreground'>{created?.key}</code>
                                    <button
                                        type='button'
                                        onClick={() => void onCopy()}
                                        className='grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-foreground/10 hover:text-foreground'
                                        aria-label='Copy key'
                                    >
                                        {copied ? <Check className='size-4 text-success' /> : <Copy className='size-4' />}
                                    </button>
                                </div>
                            </Modal.Body>
                            <Modal.Footer className='flex items-center justify-end'>
                                <Button
                                    type='button'
                                    size='md'
                                    className='bg-foreground text-background hover:bg-foreground/90'
                                    onPress={modal.close}
                                >
                                    Done
                                </Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </div>
    );
};

export default Keys;
