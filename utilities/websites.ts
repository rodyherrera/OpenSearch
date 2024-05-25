import Website from '@models/website';

interface UniqueKeywords{
    createdAt: Date,
    keyword: string
};

export const getUniqueKeywords = async (aggregateOpts: object[]): Promise<UniqueKeywords[]> => {
    const uniqueKeywords = await Website.aggregate([
        // Filter documents where metaData.keywords is defined and not null
        { $match: { 'metaData.keywords': { $exists: true, $ne: null } } },
        // Split the metaData.keywords string into an array of keywords and keep the createdAt field
        { $project: { keywords: { $split: ['$metaData.keywords', ','] }, createdAt: 1 } },
        // Convert each keyword into a separate document
        { $unwind: '$keywords' },
         // Convert keywords to lowercase, apply trim, and keep the createdAt field
        { $project: { keyword: { $trim: { input: { $toLower: '$keywords' } } }, createdAt: 1 } },
        // Group by keywords and keep the first createdAt value
        { $group: { _id: '$keyword', createdAt: { $first: '$createdAt' } } },
        // Rename field "_id" to "keyword"
        { $project: { keyword: '$_id', createdAt: 1, _id: 0 } },
        ...(aggregateOpts as any[])
    ]);
    return uniqueKeywords;
};
