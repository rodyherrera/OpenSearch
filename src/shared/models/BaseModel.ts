import { Schema, model, type Document, type Model, type SchemaDefinition } from 'mongoose';
import { getHiddenPaths } from '@/shared/models/Hidden';

export interface BaseFields{
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export const defineModel = <TDoc extends Document>(name: string, definition: SchemaDefinition<TDoc>, configure?: (schema: Schema<TDoc>) => void): Model<TDoc> => {
    const schema = new Schema<TDoc>(definition, { timestamps: true, versionKey: false });
    configure?.(schema);
    const transform = (_doc: unknown, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        for(const path of getHiddenPaths(schema)) delete ret[path];
        return ret;
    };
    schema.set('toJSON', { transform });
    schema.set('toObject', { transform });
    return model<TDoc>(name, schema);
};
