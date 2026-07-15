import Suggest from '@/modules/suggest/models/Suggest';
import type { SuggestQuery } from '@/modules/suggest/contracts/http/suggest';
import type { PublicSuggest } from '@/modules/suggest/contracts/domain/suggest';

const DEFAULT_LIMIT = 10;

export default class SuggestService{
    async search(query: SuggestQuery): Promise<PublicSuggest[]>{
        const limit = this.#resolveLimit(query.limit);
        const term = query.q?.trim();
        if(term){
            const escaped = this.#escapeRegExp(term);
            const records = await Suggest
                .find({ $text: { $search: escaped } }, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit);
            return records.map((record) => record.toJSON() as PublicSuggest);
        }
        const records = await Suggest.find().sort({ createdAt: -1 }).limit(limit);
        return records.map((record) => record.toJSON() as PublicSuggest);
    }

    #resolveLimit(raw?: string): number{
        const parsed = Number.parseInt(raw ?? '', 10);
        if(Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
        return parsed;
    }

    #escapeRegExp(value: string): string{
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
