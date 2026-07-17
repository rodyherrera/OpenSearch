import devs from '@/modules/workspace/data/starterPacks/devs.json';
import news from '@/modules/workspace/data/starterPacks/news.json';
import shopping from '@/modules/workspace/data/starterPacks/shopping.json';
import wikipedia from '@/modules/workspace/data/starterPacks/wikipedia.json';
import type { StarterPack } from '@/modules/workspace/contracts/domain/workspace';

export default class StarterPackService{
    private static readonly packs: Record<string, string[]> = { devs, news, shopping, wikipedia };

    list(): StarterPack[]{
        return Object.entries(StarterPackService.packs).map(([name, urls]) => ({ name, urlCount: urls.length }));
    }

    select(names: string[]): string[]{
        return [...new Set(names)].filter((name) => name in StarterPackService.packs);
    }

    urlsFor(names: string[]): string[]{
        const urls = new Set<string>();
        for(const name of names){
            for(const url of StarterPackService.packs[name] ?? []) urls.add(url);
        }
        return [...urls];
    }
}
