import devs from './devs.json';
import news from './news.json';
import wikipedia from './wikipedia.json';
import shopping from './shopping.json';

const scrapingTargets = {
    devs,
    news,
    shopping,
    wikipedia
};

export const scrapingTargetsList = Object.values(scrapingTargets).flat();

export default scrapingTargets;