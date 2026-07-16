import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AuthShell, Band } from '@/modules/auth/components/AuthShell';
import { Form } from '@/shared/components/forms/Form';
import { Field } from '@/shared/components/forms/Field';
import { useLogin } from '@/modules/auth/hooks/useLogin';
import { useRegister } from '@/modules/auth/hooks/useRegister';

type Mode = 'login' | 'signup';

const tabClass = (active: boolean): string =>
    active
        ? 'rounded-full border border-hairline bg-surface px-6 py-1.5 text-sm font-medium text-foreground shadow-sm'
        : 'rounded-full px-6 py-1.5 text-sm text-muted transition-colors hover:text-foreground';

const SignIn = () => {
    const [mode, setMode] = useState<Mode>('login');
    const login = useLogin();
    const register = useRegister();

    return (
        <AuthShell>
            <Band className='grid grid-cols-2'>
                <div className='flex items-center justify-center border-r border-hairline py-5'>
                    <button type='button' onClick={() => setMode('login')} className={tabClass(mode === 'login')}>Log In</button>
                </div>
                <div className='flex items-center justify-center py-5'>
                    <button type='button' onClick={() => setMode('signup')} className={tabClass(mode === 'signup')}>Sign Up</button>
                </div>
            </Band>

            <Band className='px-8 py-8'>
                {mode === 'login' ? (
                    <Form form={login} className='flex flex-col gap-4'>
                        <Field form={login} name='email' label='Email' type='email' placeholder='name@example.com' />
                        <Field form={login} name='password' label='Password' type='password' placeholder='••••••••' />
                        <Button type='submit' fullWidth size='md'
                            className='mt-1 bg-accent text-accent-foreground hover:bg-accent-hover'
                            isPending={login.submitting}>
                            Sign in
                        </Button>
                        <Link to='/forgot-password' className='text-center text-sm text-accent hover:underline'>
                            Forgot your password?
                        </Link>
                    </Form>
                ) : (
                    <Form form={register} className='flex flex-col gap-4'>
                        <Field form={register} name='email' label='Email' type='email' placeholder='name@example.com' />
                        <Field form={register} name='password' label='Password' type='password' placeholder='At least 8 characters' />
                        <Button type='submit' fullWidth size='md'
                            className='mt-1 bg-accent text-accent-foreground hover:bg-accent-hover'
                            isPending={register.submitting}>
                            Create Account
                        </Button>
                    </Form>
                )}
            </Band>

            <Band className='px-8 py-6'>
                <p className='text-center text-xs text-muted/70'>
                    A personal workspace is created for you automatically.
                </p>
            </Band>
        </AuthShell>
    );
};

export default SignIn;
