import type { BaseSchema, BaseIssue, InferOutput } from 'valibot';
import type { FormEvent } from 'react';

export type AnySchema = BaseSchema<unknown, unknown, BaseIssue<unknown>>;

export interface UseFormOptions<S extends AnySchema>{
    schema: S;
    initialValues: InferOutput<S>;
    onSubmit: (values: InferOutput<S>) => void | Promise<void>;
    validateOn?: 'blur' | 'change' | 'submit';
}

export interface FieldBinding<V>{
    name: string;
    value: V;
    onChange: (value: V) => void;
    onBlur: () => void;
    isInvalid: boolean;
    errorMessage: string | undefined;
}

export interface FormApi<S extends AnySchema>{
    values: InferOutput<S>;
    errors: Partial<Record<keyof InferOutput<S>, string>>;
    submitting: boolean;
    submitError: string | null;
    isValid: boolean;
    field: <K extends keyof InferOutput<S>>(name: K) => FieldBinding<InferOutput<S>[K]>;
    handleSubmit: (event?: FormEvent) => void;
    setValues: (patch: Partial<InferOutput<S>>) => void;
    reset: () => void;
}
