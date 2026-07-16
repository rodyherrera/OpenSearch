import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AuthShell, Band } from '@/modules/auth/components/AuthShell';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useForgotPassword } from '@/modules/auth/hooks/useForgotPassword';

const ForgotPassword = () => {
    const { form, sent } = useForgotPassword();

    return (
        <AuthShell>
            <Band className='px-8 py-8'>
                <h1 className='text-lg font-semibold text-foreground'>Reset your password</h1>
                <p className='mt-1 mb-6 text-sm text-muted'>We’ll email you a reset link.</p>

                {sent ? (
                    <div className='flex flex-col gap-4'>
                        <p className='text-sm text-muted'>If an account exists for that email, a reset link is on its way.</p>
                        <Link to='/sign-in' className='text-sm text-accent hover:underline'>Back to sign in</Link>
                    </div>
                ) : (
                    <Form form={form} className='flex flex-col gap-4'>
                        <Field form={form} name='email' label='Email' type='email' placeholder='name@example.com' />
                        <Button type='submit' fullWidth size='md'
                            className='mt-1 bg-accent text-accent-foreground hover:bg-accent-hover'
                            isPending={form.submitting}>
                            Send reset link
                        </Button>
                        <Link to='/sign-in' className='text-center text-sm text-muted hover:text-foreground'>Back to sign in</Link>
                    </Form>
                )}
            </Band>
        </AuthShell>
    );
};

export default ForgotPassword;
