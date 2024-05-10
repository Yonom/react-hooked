import { useMemo } from "react";

import type QueryReference from "../QueryReference";
import QueryStore from "../QueryStore";
import {
  runMountEffects,
  runUnmountedReadEffects,
  runUnsubscribeEffects,
} from "../queryEffects";
import type { Query, QueryResult } from "../types";

type QueryHookState<T> = {
  readonly subscribe: (callback: () => void) => () => void;
  readonly getResult: () => QueryResult<T>;
};

type InternalQueryHookState<T> = QueryHookState<T> & {
  ref: QueryReference<T>;
  query: Query<T>;
  isMounted: boolean;
};

const ensureRefUndisposed = <T>(state: InternalQueryHookState<T>) => {
  if (state.ref.isDisposed) {
    state.ref = QueryStore.getOrCreate(state.query);
  }
};

export const useQueryHookState = <T>(query: Query<T>): QueryHookState<T> => {
  const ref = QueryStore.getOrCreate(query);

  // reset state when queryRef changes
  // this causes useSyncExternalStore to re-subscribe

  const state = useMemo(() => {
    const state = {
      ref,
      subscribe: (callback) => {
        ensureRefUndisposed(state);
        const unsubscribe = state.ref.subscribe(() => callback());
        state.isMounted = true;

        runMountEffects(state.query, state.ref);
        return () => {
          state.isMounted = false;

          runUnsubscribeEffects(state.query, state.ref);
          unsubscribe();
        };
      },
      getResult: () => {
        ensureRefUndisposed(state);
        return state.ref.result;
      },
      isMounted: false,
    } as InternalQueryHookState<T>;
    return state;
  }, [ref]);
  state.query = query;

  if (!state.isMounted) {
    runUnmountedReadEffects(query, ref);
  }

  return state;
};
