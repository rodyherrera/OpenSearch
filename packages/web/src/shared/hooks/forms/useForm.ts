import { useRef, useState } from 'react';
import { safeParse } from 'valibot';
import { ApiError } from '@/shared/services/ApiError';
import type { FormEvent } from 'react';
import type { InferOutput } from 'valibot';
import type { AnySchema, FieldBinding, FormApi, UseFormOptions } from '@/shared/contracts/form';

type ErrorMap = Partial<Record<string, string>>;
type TouchedMap = Partial<Record<string, boolean>>;

const fieldErrorsFromBody = (body: unknown): ErrorMap | null => {
    if(!body || typeof body !== 'object') return null;
    const detail = (body as { errors?: unknown }).errors;
    if(!detail || typeof detail !== 'object') return null;

    const map: ErrorMap = {};
    for(const [key, value] of Object.entries(detail as Record<string, unknown>)){
        if(typeof value === 'string') map[key] = value;
    }
    return Object.keys(map).length > 0 ? map : null;
};

export const useForm = <S extends AnySchema>({
    schema,
    initialValues,
    onSubmit,
    validateOn = 'blur'
}: UseFormOptions<S>): FormApi<S> => {
    type Values = InferOutput<S>;

    const initialRef = useRef(initialValues);
    const [values, setValuesState] = useState<Values>(initialValues);
    const [errors, setErrors] = useState<ErrorMap>({});
    const [touched, setTouched] = useState<TouchedMap>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const mergeValues = (base: Values, patch: Partial<Values>): Values =>
        ({ ...(base as object), ...patch }) as Values;

    const validate = (input: Values): ErrorMap => {
        const result = safeParse(schema, input);
        if(result.success) return {};

        const map: ErrorMap = {};
        for(const issue of result.issues){
            const key = issue.path?.[0]?.key;
            if(typeof key === 'string' && !(key in map)) map[key] = issue.message;
        }
        return map;
    };

    const applyFieldError = (key: string, map: ErrorMap) => {
        setErrors((prev) => {
            const next = { ...prev };
            if(map[key]) next[key] = map[key];
            else delete next[key];
            return next;
        });
    };

    const handleChange = (key: string, value: unknown) => {
        const next = mergeValues(values, { [key]: value } as Partial<Values>);
        setValuesState(next);
        if(validateOn === 'change' || touched[key]) applyFieldError(key, validate(next));
    };

    const handleBlur = (key: string) => {
        if(!touched[key]) setTouched((prev) => ({ ...prev, [key]: true }));
        if(validateOn !== 'submit') applyFieldError(key, validate(values));
    };

    const applySubmitError = (error: unknown) => {
        if(error instanceof ApiError){
            const fieldErrors = fieldErrorsFromBody(error.body);
            if(fieldErrors) setErrors((prev) => ({ ...prev, ...fieldErrors }));
            setSubmitError(error.message);
            return;
        }
        setSubmitError(error instanceof Error ? error.message : 'Something went wrong');
    };

    const handleSubmit = (event?: FormEvent) => {
        event?.preventDefault();
        if(submitting) return;

        const map = validate(values);
        const allTouched: TouchedMap = {};
        for(const key of Object.keys(values as object)) allTouched[key] = true;
        setTouched(allTouched);
        setErrors(map);
        if(Object.keys(map).length > 0) return;

        setSubmitError(null);
        setSubmitting(true);
        Promise.resolve()
            .then(() => onSubmit(values))
            .then(() => setSubmitting(false))
            .catch((error: unknown) => {
                setSubmitting(false);
                applySubmitError(error);
            });
    };

    const field = <K extends keyof Values>(name: K): FieldBinding<Values[K]> => {
        const key = name as string;
        return {
            name: key,
            value: values[name],
            onChange: (value) => handleChange(key, value),
            onBlur: () => handleBlur(key),
            isInvalid: errors[key] !== undefined,
            errorMessage: errors[key]
        };
    };

    const setValues = (patch: Partial<Values>) => {
        setValuesState((prev) => mergeValues(prev, patch));
    };

    const reset = () => {
        setValuesState(initialRef.current);
        setErrors({});
        setTouched({});
        setSubmitting(false);
        setSubmitError(null);
    };

    return {
        values,
        errors: errors as Partial<Record<keyof Values, string>>,
        submitting,
        submitError,
        isValid: safeParse(schema, values).success,
        field,
        handleSubmit,
        setValues,
        reset
    };
};
