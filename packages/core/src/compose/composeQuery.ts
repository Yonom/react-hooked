import { Observable } from "rxjs";

import QueryReference from "../QueryReference";
import QueryStore from "../QueryStore";
import { COMPLETE_TOKEN, Query } from "../types";

type ComposeReadFunction = <T>(q: Query<T>) => Promise<T>;

type ComposeQueryOptions<T> = Omit<Query<T>, "observable"> & {
  render: (context: { read: ComposeReadFunction }) => Promise<T | SkipToken>;
};

type SubscribeHandle = {
  version: number;
  bound?: true;
  unsubscribe: () => void;
};

// two cancellation signals:
// startNew: a newer run was started but this run can still emit before it does
// emitNew: a newer run has emitted, this run can no longer emit
// TODO how to signal this to existing runs?

export const skipToken = Symbol("skipToken");
type SkipToken = typeof skipToken;

const composeQuery = <T>(query: ComposeQueryOptions<T>): Query<T> => {
  const observable = new Observable<T>((subscriber) => {
    let currentVersion = -1;
    let lastEmitVersion = -1;
    const subscribeHandles = new Map<string, SubscribeHandle>();
    const startNew = () => {
      const version = ++currentVersion;
      const readEffect = <TRead>(
        q: Query<TRead>,
        ref: QueryReference<TRead>,
      ) => {
        let handle = subscribeHandles.get(q.key);
        if (handle) {
          handle.version = Math.max(handle.version, version);
        } else {
          handle = {
            version,
            unsubscribe: () => {},
          };
          subscribeHandles.set(q.key, handle);
          handle.unsubscribe = ref.subscribe((v) => {
            if (v === COMPLETE_TOKEN) return;
            if (!handle!.bound) {
              handle!.bound = true;
              return;
            }
            if (handle!.version !== currentVersion) return;

            startNew();
          });
        }
      };

      const emitEffect = () => {
        if (version < lastEmitVersion) return;
        lastEmitVersion = version;

        for (const [key, handle] of subscribeHandles) {
          if (handle.version < version) {
            subscribeHandles.delete(key);
          }
        }
      };

      const read = async <TRead>(q: Query<TRead>) => {
        if (q.key === query.key) throw new Error("Query cannot read itself");

        const ref = QueryStore.getOrCreate(q);
        readEffect(q, ref);
        return ref.result;
      };

      try {
        query.render({ read }).then(
          (v) => {
            if (v === skipToken) return;

            emitEffect();
            subscriber.next(v);
          },
          (e) => {
            emitEffect();
            subscriber.error(e);
          },
        );
      } catch (error) {
        emitEffect();
        subscriber.error(error);
      }
    };

    startNew();

    // cleanup
    return () => {
      for (const handle of subscribeHandles.values()) {
        handle.unsubscribe();
      }
    };
  });
  return {
    ...query,
    observable,
  };
};

export default composeQuery;
