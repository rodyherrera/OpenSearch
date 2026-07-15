import { Button } from '@heroui/react';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useLogin } from '@/modules/auth/hooks/useLogin';

const SignIn = () => {
    const form = useLogin();

    return (
        <main className='flex min-h-dvh items-center justify-center bg-background p-4'>
            <section className='w-full max-w-sm'>
                <h1 className='mb-6 text-center text-2xl font-semibold text-foreground'>
                    Crawl<span className='text-primary'>m</span>
                </h1>

                <Form form={form} className='flex flex-col gap-3'>
                    <Field form={form} name='email' label='Email' type='email' placeholder='Email' />
                    <Field form={form} name='password' label='Password' type='password' placeholder='Password' />

                    <Button
                        type='submit'
                        fullWidth
                        size='md'
                        className='mt-2 bg-foreground text-background hover:bg-foreground/90'
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
