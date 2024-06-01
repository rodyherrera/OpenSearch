// @ts-ignore
import CDrakeSE from 'cdrake-se';

/**
 * Generates n-grams from the given content.
 * @param {string} content - The input content.
 * @param {number} maxLength - The maximum length of the n-grams.
 * @returns {string[]} An array of n-grams.
*/
const generateNgrams = (content: string, maxLength: number): string[] => {
    const tokens = content.toLowerCase().split(/\s+/).filter((token) => token.length <= maxLength);
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - 4; i++){
        const ngram = tokens.slice(i, i + 4).join(' ');
        ngrams.push(ngram);
    }
    return ngrams;
};

/**
 * Calculates the frequencies of the given n-grams.
 * @param {string[]} ngrams - The array of n-grams.
 * @returns {{ [ngram: string]: number }} An object with n-gram frequencies.
*/
const calculateFrequencies = (ngrams: string[]): { [ngram: string]: number } => {
    const frequencies: { [ngram: string]: number } = {};
    for(const ngram of ngrams){
        frequencies[ngram] = frequencies[ngram] ? frequencies[ngram] + 1 : 1;
    }
    return frequencies;
};

/**
 * Sorts the n-grams by frequency and returns the top suggestions.
 * @param {{ [ngram: string]: number }} frequencies - The object with n-gram frequencies.
 * @param {number} maxSuggestions - The maximum number of suggestions.
 * @returns {string[]} An array of sorted n-grams.
*/
const getSortedNgrams = (frequencies: { [ngram: string]: number }, maxSuggestions: number): string[] => {
    return Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxSuggestions)
        .map(([ ngram ]) => ngram);
}

/**
 * Fetches suggestions from the CDrakeSE API.
 * @param {string[]} ngrams - The array of n-grams.
 * @returns {Promise<string[]>} A promise resolving to an array of suggestions.
*/
const fetchSuggestions = async (ngrams: string[]): Promise<string[]> => {
    const suggestionsPromises = ngrams.map((ngram) => CDrakeSE({ Query: ngram, Method: 'Suggest' }));
    const suggestionsResults = await Promise.allSettled(suggestionsPromises);
    const successfulResults = suggestionsResults.filter((result) => result.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const suggestions = successfulResults
        .map((result) => result.value)
        .map(({ Results }: { Results: string }) => Results)
        .flat();
    return suggestions;
};

/**
 * Generates suggestions from the given content.
 * @param {string} content - The input content.
 * @param {number} maxSuggestions - The maximum number of suggestions.
 * @returns {Promise<string[]>} A promise resolving to an array of suggestions.
*/
export const suggestionsFromContent = async (content: string, maxSuggestions: number): Promise<string[]> => {
    const ngrams = generateNgrams(content, 16);
    const frequencies = calculateFrequencies(ngrams);
    const sortedNgrams = getSortedNgrams(frequencies, maxSuggestions);
    const suggestions = await fetchSuggestions(sortedNgrams);
    return suggestions;
};