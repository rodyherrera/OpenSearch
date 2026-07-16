import { Button } from '@heroui/react';
import { Flame } from 'lucide-react';
import Crosshairs from '@/shared/components/ui/Crosshairs';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useLogin } from '@/modules/auth/hooks/useLogin';

const SignIn = () => {
    const form = useLogin();

    return (
        <main className='bg-blueprint flex min-h-dvh items-center justify-center bg-background p-4'>
            <section className='relative w-full max-w-sm rounded-2xl border border-hairline bg-surface p-8 shadow-xl shadow-black/10'>
                <Crosshairs />
                <div className='mb-8 flex flex-col items-center gap-3'>
                    <span className='grid size-11 place-items-center rounded-xl bg-accent/10'>
                        <Flame className='size-6 text-accent' fill='currentColor' />
                    </span>
                    <h1 className='text-xl font-semibold tracking-tight text-foreground'>Sign in to Crawlm</h1>
                    <p className='mono-label text-muted/70'>Search · Scrape · Map · Crawl</p>
                </div>

                <Form form={form} className='flex flex-col gap-3'>
                    <Field form={form} name='email' label='Email' type='email' placeholder='Email' />
                    <Field form={form} name='password' label='Password' type='password' placeholder='Password' />

                    <Button
                        type='submit'
                        fullWidth
                        size='md'
                        className='mt-2 bg-accent text-accent-foreground hover:bg-accent-hover'
                        isPending={form.submitting}
                    >
                        Sign in
                    </Button>
                </Form>
            </section>
        </main>
    );
};

export default SignIn;
