import mongoose, { Document, Model } from 'mongoose';

// @ts-ignore
import CDrakeSE from 'cdrake-se';

interface SuggestDocument extends Document{
    suggest: string;
};

const suggestSchema = new mongoose.Schema<SuggestDocument>({
    suggest: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    }
}, {
    timestamps: true
});

suggestSchema.index({ suggest: 1 });
suggestSchema.index({ suggest: 'text' });

const Suggest: Model<SuggestDocument> = mongoose.model<SuggestDocument>('Suggest', suggestSchema);

export const suggestionsFromContent = async (content: string, maxSuggestions: number): Promise<string[]> => {
    content = content.toLowerCase();
    const tokens = content.split(/\s+/).filter((token) => token.length <= 16);

    // Generate n-grams
    const ngrams: string[] = [];
    for(let i = 0; i <= tokens.length - 4; i++){
        let ngram = tokens.slice(i, i + 4).join(' ');
        ngrams.push(ngram);
    }

    // Calculate frequencies of n-grams
    const frequencies: { [ngram: string]: number } = {};
    for(const ngram of ngrams){
        frequencies[ngram] = frequencies[ngram] ? frequencies[ngram] + 1 : 1;
    }

    // Sort n-grams by frequency and limit to maxSuggestions
    const sortedNgrams = Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxSuggestions)
        .map(([ngram]) => ngram);

    // Fetch suggestions using CDrakeSE in parallel
    const suggestionsPromises = sortedNgrams.map((ngram) => CDrakeSE({ Query: ngram, Method: 'Suggest' }));
    const suggestionsResults = await Promise.allSettled(suggestionsPromises);
    const successfulResults = suggestionsResults
        .filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const suggestions = successfulResults
        .map(result => result.value)
        .map(({ Results }: { Results: string }) => Results)
        .flat();
    return suggestions;
};


export default Suggest;