import type { ReactNode } from 'react';
import type { AnySchema, FormApi } from '@/shared/contracts/form';

export interface FormProps<S extends AnySchema>{
    form: FormApi<S>;
    children: ReactNode;
    className?: string;
}

export const Form = <S extends AnySchema>({ form, children, className }: FormProps<S>) => (
    <form noValidate className={className} onSubmit={form.handleSubmit}>
        <fieldset disabled={form.submitting} className='contents'>
            {children}
        </fieldset>
        {form.submitError ? (
            <p role='alert' className='text-sm text-[var(--danger)]'>{form.submitError}</p>
        ) : null}
    </form>
);
