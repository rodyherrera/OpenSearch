import Website from '@models/website';

interface UniqueKeywords{
    createdAt: Date,
    keyword: string
};

// TODO: unwrap "keywords" from metaData and create 'text' index!!!!!!!
export const getUniqueKeywords = async (aggregateOpts: object[]): Promise<UniqueKeywords[]> => {
    const uniqueKeywords = await Website.aggregate([
        { $match: { keywords: { $exists: true, $ne: null } } },
        {
            $project: {
                keyword: {
                    $trim: { input: { $toLower: { $arrayElemAt: [{ $split: ['$keywords', ','] }, 0] } } }
                },
                createdAt: 1
            }
        },
        { $group: { _id: '$keyword', createdAt: { $first: '$createdAt' } } },
        { $project: { keyword: '$_id', createdAt: 1, _id: 0 } },
        ...(aggregateOpts as any[])
    ]);
    return uniqueKeywords;
};
