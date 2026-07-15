import type { Schema } from 'mongoose';

const hiddenPaths = new WeakMap<Schema, Set<string>>();

export const hidden = (schema: Schema, field: string): void => {
    let fields = hiddenPaths.get(schema);
    if(!fields){
        fields = new Set();
        hiddenPaths.set(schema, fields);
    }
    fields.add(field);
};

export const getHiddenPaths = (schema: Schema): Set<string> => {
    return hiddenPaths.get(schema) ?? new Set();
};
