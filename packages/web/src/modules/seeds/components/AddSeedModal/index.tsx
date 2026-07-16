import { useState } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useSeeds } from '@/modules/seeds/hooks/useSeeds';
import type { ChangeEvent, FormEvent } from 'react';

interface AddSeedModalProps{
    // Called after seeds are successfully added, so the listing can refresh.
    onAdded?: () => void;
}

const AddSeedModal = ({ onAdded }: AddSeedModalProps) => {
    const modal = useOverlayState();
    const [value, setValue] = useState('');
    const [emptyError, setEmptyError] = useState(false);
    const { submit, adding, error } = useSeeds();

    const reset = () => {
        setValue('');
        setEmptyError(false);
    };

    const close = () => {
        reset();
        modal.close();
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if(value.trim().length === 0){
            setEmptyError(true);
            return;
        }
        setEmptyError(false);
        const added = await submit(value);
        if(added){
            reset();
            onAdded?.();
            modal.close();
        }
    };

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setValue(event.target.value);
        if(emptyError) setEmptyError(false);
    };

    return (
        <>
            <Button
                onPress={modal.open}
                size='sm'
                className='inline-flex items-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent-hover'
            >
                <Plus className='size-4' />
                Add seed
            </Button>

            <Modal isOpen={modal.isOpen} onOpenChange={modal.setOpen}>
                <Modal.Backdrop>
                    <Modal.Container size='md'>
                        <Modal.Dialog>
                            <form onSubmit={handleSubmit}>
                                <Modal.Header>
                                    <Modal.Heading className='text-lg font-medium text-foreground'>
                                        Add seed URLs
                                    </Modal.Heading>
                                    <p className='mt-1 text-sm text-muted'>
                                        One URL per line; they're normalized, saved as seeds, and enqueued into the crawl frontier.
                                    </p>
                                </Modal.Header>

                                <Modal.Body className='flex flex-col gap-3'>
                                    <textarea
                                        autoFocus
                                        rows={6}
                                        value={value}
                                        onChange={handleChange}
                                        disabled={adding}
                                        placeholder='https://example.com'
                                        className='w-full rounded-lg border border-hairline bg-surface p-3 text-sm'
                                    />

                                    {emptyError ? (
                                        <p role='alert' className='text-sm text-danger'>Enter at least one URL.</p>
                                    ) : null}

                                    {error ? (
                                        <p role='alert' className='text-sm text-danger'>{error.message}</p>
                                    ) : null}
                                </Modal.Body>

                                <Modal.Footer className='flex items-center justify-end gap-2'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='md'
                                        onPress={close}
                                        isDisabled={adding}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type='submit'
                                        size='md'
                                        className='bg-accent text-accent-foreground hover:bg-accent-hover'
                                        isPending={adding}
                                    >
                                        Add seeds
                                    </Button>
                                </Modal.Footer>
                            </form>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </>
    );
};

export default AddSeedModal;
