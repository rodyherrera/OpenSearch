// @ts-ignore
import CDrakeSE from 'cdrake-se';
import _ from 'lodash';

/**
 * Generates n-grams from the given content.
 * @param {string} content - The input content.
 * @param {number} maxLength - The maximum length of the n-grams.
 * @returns {string[]} An array of n-grams.
*/
const generateNgrams = (content: string, maxLength: number): string[] => {
    const tokens = content.toLowerCase().split(/\s+/).filter((token) => token.length <= maxLength);
    return _.flatMap(tokens, (v, i) => tokens.slice(i, i + 4).join(' '));
};

/**
 * Calculates the frequencies of the given n-grams.
 * @param {string[]} ngrams - The array of n-grams.
 * @returns {{ [ngram: string]: number }} An object with n-gram frequencies.
*/
const calculateFrequencies = (ngrams: string[]): { [ngram: string]: number } => {
    return _.countBy(ngrams);
};

/**
 * Sorts the n-grams by frequency and returns the top suggestions.
 * @param {{ [ngram: string]: number }} frequencies - The object with n-gram frequencies.
 * @param {number} maxSuggestions - The maximum number of suggestions.
 * @returns {string[]} An array of sorted n-grams.
*/
const getSortedNgrams = (frequencies: { [ngram: string]: number }, maxSuggestions: number): string[] => {
    return _.chain(frequencies)
        .toPairs()
        .orderBy(['1'], ['desc'])
        .take(maxSuggestions)
        .map(([ ngram ]) => ngram)
        .value();
}

/**
 * Fetches suggestions from the CDrakeSE API.
 * @param {string[]} ngrams - The array of n-grams.
 * @returns {Promise<string[]>} A promise resolving to an array of suggestions.
*/
const fetchSuggestions = async (ngrams: string[]): Promise<string[]> => {
    const suggestionsPromises = _.map(ngrams, (ngram) => CDrakeSE({ Query: ngram, Method: 'Suggest' }));
    const suggestionsResults = await Promise.allSettled(suggestionsPromises);
    const successfulResults = _.filter(suggestionsResults, { status: 'fulfilled' }) as PromiseFulfilledResult<any>[];
    const suggestions = _.flatMap(successfulResults, 'value.Results');
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