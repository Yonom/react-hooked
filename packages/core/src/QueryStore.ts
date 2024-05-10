import QueryReference from "./QueryReference";
import type { Query } from "./types";

// multiton store for query references
class QueryStore {
  private _cache = new Map<string, QueryReference<unknown>>();

  public get<T>({ key }: Query<T>) {
    return this._cache.get(key);
  }

  public getOrCreate<T>(
    { key, observable }: Query<T>,
    setup?: (ref: QueryReference<T>) => void,
  ): QueryReference<T> {
    let ref = this._cache.get(key) as QueryReference<T> | undefined;

    if (ref == null) {
      ref = new QueryReference(observable, setup, () => {
        this._cache.delete(key);
      });

      this._cache.set(key, ref as QueryReference<unknown>);
    } else {
      setup?.(ref);
    }

    return ref;
  }
}

export default new QueryStore();
