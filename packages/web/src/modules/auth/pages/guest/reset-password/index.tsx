import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AuthShell, Band } from '@/modules/auth/components/AuthShell';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useResetPassword } from '@/modules/auth/hooks/useResetPassword';

const ResetPassword = () => {
    const { form, hasToken } = useResetPassword();

    return (
        <AuthShell>
            <Band className='px-8 py-8'>
                <h1 className='text-lg font-semibold text-foreground'>Choose a new password</h1>
                <p className='mt-1 mb-6 text-sm text-muted'>Set a new password for your account.</p>

                {hasToken ? (
                    <Form form={form} className='flex flex-col gap-4'>
                        <Field form={form} name='password' label='New password' type='password' placeholder='At least 8 characters' />
                        <Field form={form} name='confirm' label='Confirm password' type='password' placeholder='Repeat password' />
                        <Button type='submit' fullWidth size='md'
                            className='mt-1 bg-accent text-accent-foreground hover:bg-accent-hover'
                            isPending={form.submitting}>
                            Reset password
                        </Button>
                    </Form>
                ) : (
                    <div className='flex flex-col gap-4'>
                        <p className='text-sm text-muted'>This reset link is missing or invalid. Request a new one.</p>
                        <Link to='/forgot-password' className='text-sm text-accent hover:underline'>Request a reset link</Link>
                    </div>
                )}
            </Band>
        </AuthShell>
    );
};

export default ResetPassword;
