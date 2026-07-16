import { useEffect, useRef, useState } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useWorkspaces } from '@/modules/workspaces/hooks/useWorkspaces';
import type { FormEvent } from 'react';
import type { Workspace } from '@/modules/workspaces/contracts/workspace';

const initialOf = (name: string): string => (name.trim()[0] ?? 'W').toUpperCase();

const Avatar = ({ name, className = 'size-[18px] text-[10px]' }: { name: string; className?: string }) => (
    <span className={`grid shrink-0 place-items-center rounded bg-accent font-mono font-bold text-accent-foreground ${className}`}>
        {initialOf(name)}
    </span>
);

const WorkspaceSwitcher = () => {
    const { workspaces, activeId, active, switchTo, create } = useWorkspaces();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const modal = useOverlayState();
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const onDown = (event: MouseEvent) => {
            if(ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const pick = (workspace: Workspace) => {
        switchTo(workspace.id);
        setOpen(false);
    };

    const onCreate = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = name.trim();
        if(!trimmed) return;
        setCreating(true);
        try{
            await create(trimmed);
            setName('');
            modal.close();
        }finally{
            setCreating(false);
        }
    };

    return (
        <div ref={ref} className='relative'>
            <button
                type='button'
                onClick={() => setOpen((value) => !value)}
                className='inline-flex items-center gap-2 rounded-lg border border-hairline px-2.5 py-1.5 text-[13px] text-foreground transition-colors hover:bg-foreground/5'
            >
                <Avatar name={active?.name ?? 'Workspace'} />
                <span className='max-w-40 truncate'>{active?.name ?? 'Workspace'}</span>
                <ChevronDown className='size-3.5 text-muted' />
            </button>

            {open ? (
                <div className='absolute top-full left-0 z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-hairline bg-surface p-1 shadow-xl shadow-black/20'>
                    <span className='mono-label block px-2.5 py-1.5 text-muted/60'>Workspaces</span>
                    {workspaces.map((workspace) => (
                        <button
                            key={workspace.id}
                            type='button'
                            onClick={() => pick(workspace)}
                            className='flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-foreground/5'
                        >
                            <Avatar name={workspace.name} />
                            <span className='min-w-0 flex-1 truncate'>{workspace.name}</span>
                            {workspace.id === activeId ? <Check className='size-4 shrink-0 text-accent' /> : null}
                        </button>
                    ))}
                    <div className='my-1 border-t border-hairline' />
                    <button
                        type='button'
                        onClick={() => { setOpen(false); modal.open(); }}
                        className='flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground'
                    >
                        <span className='grid size-[18px] shrink-0 place-items-center rounded border border-hairline'>
                            <Plus className='size-3' />
                        </span>
                        New workspace
                    </button>
                </div>
            ) : null}

            <Modal isOpen={modal.isOpen} onOpenChange={modal.setOpen}>
                <Modal.Backdrop>
                    <Modal.Container size='sm'>
                        <Modal.Dialog>
                            <form onSubmit={onCreate}>
                                <Modal.Header>
                                    <Modal.Heading className='text-lg font-medium text-foreground'>New workspace</Modal.Heading>
                                    <p className='mt-1 text-sm text-muted'>
                                        A workspace is a topic with its own seeds and crawled corpus.
                                    </p>
                                </Modal.Header>
                                <Modal.Body>
                                    <input
                                        autoFocus
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder='e.g. Molecular dynamics'
                                        className='w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none'
                                    />
                                </Modal.Body>
                                <Modal.Footer className='flex items-center justify-end gap-2'>
                                    <Button type='button' variant='ghost' size='md' onPress={modal.close} isDisabled={creating}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type='submit'
                                        size='md'
                                        isPending={creating}
                                        className='bg-accent text-accent-foreground hover:bg-accent-hover'
                                    >
                                        Create
                                    </Button>
                                </Modal.Footer>
                            </form>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </div>
    );
};

export default WorkspaceSwitcher;
