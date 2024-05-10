import { Observer } from "rxjs";

import QueryStore from "../QueryStore";
import { runUnsubscribeEffects } from "../queryEffects";
import { COMPLETE_TOKEN, Query, RESET_TOKEN } from "../types";

// call on bind with most recent value?

export const subscribeToQuery = <T>(
  query: Query<T>,
  observer: Partial<Observer<T> & { reset?: () => void }>,
) => {
  let disposed = false;
  let unsubscribe = undefined as (() => void) | undefined;

  const ref = QueryStore.getOrCreate(query, (ref) => {
    unsubscribe = ref.subscribe((result) => {
      if (result === RESET_TOKEN) {
        observer.reset?.();
      } else if (result === COMPLETE_TOKEN) {
        observer.complete?.();
      } else if (result.status === "rejected") {
        observer.error?.(result.reason);
      } else if (result.status === "fulfilled") {
        observer.next?.(result.value);
      }
    });
  });

  return () => {
    if (disposed) return;
    disposed = true;

    runUnsubscribeEffects(query, ref);
    unsubscribe!();
  };
};
