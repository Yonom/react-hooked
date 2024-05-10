import QueryReference from "./QueryReference";
import { Query } from "./types";

// multiton store for query references
class QueryStore {
  private static _cache = new Map<string, QueryReference<any>>();

  public static get<T>({ key }: Query<T>) {
    return this._cache.get(key);
  }

  public static getOrCreate<T>(
    { key, observable }: Query<T>,
    setup?: (ref: QueryReference<T>) => void,
  ): QueryReference<T> {
    let ref = this._cache.get(key);

    if (ref == null) {
      ref = new QueryReference(observable, setup, () => {
        this._cache.delete(key);
      });

      this._cache.set(key, ref);
    } else {
      setup?.(ref);
    }

    return ref;
  }
}

export default QueryStore;
