import type { BaseFields } from '@/shared/models/BaseModel';

export interface SuggestFields{
    suggest: string;
}

export type PublicSuggest = SuggestFields & BaseFields;
