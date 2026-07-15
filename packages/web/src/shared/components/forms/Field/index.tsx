import { TextField, Label, Input, FieldError } from '@heroui/react';
import type { ReactNode } from 'react';
import type { InferOutput } from 'valibot';
import type { AnySchema, FieldBinding, FormApi } from '@/shared/contracts/form';

export interface FieldProps<S extends AnySchema>{
    form: FormApi<S>;
    name: keyof InferOutput<S> & string;
    label?: string;
    type?: string;
    placeholder?: string;
    children?: (binding: FieldBinding<unknown>) => ReactNode;
}

export const Field = <S extends AnySchema>({
    form,
    name,
    label,
    type = 'text',
    placeholder,
    children
}: FieldProps<S>) => {
    const binding = form.field(name);

    if(children) return <>{children(binding as FieldBinding<unknown>)}</>;

    const text = binding as unknown as FieldBinding<string>;

    return (
        <TextField
            name={text.name}
            type={type}
            value={text.value ?? ''}
            onChange={text.onChange}
            onBlur={text.onBlur}
            isInvalid={text.isInvalid}
            isDisabled={form.submitting}
            validationBehavior='aria'
            fullWidth
        >
            {label ? <Label>{label}</Label> : null}
            <Input placeholder={placeholder} />
            <FieldError>{text.errorMessage}</FieldError>
        </TextField>
    );
};
