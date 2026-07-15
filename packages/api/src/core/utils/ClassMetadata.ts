export default class ClassMetadata<T>{
    #store = new WeakMap<object, T[]>();

    append(ctor: object, item: T): void{
        let items = this.#store.get(ctor);
        if(!items){
            items = [];
            this.#store.set(ctor, items);
        }

        items.push(item);
    }

    get(ctor: object): T[]{
        return this.#store.get(ctor) ?? [];
    }
}
