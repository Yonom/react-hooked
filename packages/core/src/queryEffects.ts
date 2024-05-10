import QueryReference from "./QueryReference";
import { Query } from "./types";

const hasSettleRetainSymbol = Symbol("hasSettleRetain");

const querySettleRetainEffect = <T>(queryRef: QueryReference<T>) => {
  if (queryRef.result.status !== "pending") return;

  const result = queryRef.result as { [hasSettleRetainSymbol]?: boolean };
  if (!result[hasSettleRetainSymbol]) {
    result[hasSettleRetainSymbol] = true;

    queryRef.result
      .catch(() => {})
      .finally(() => {
        queryRef.temporaryRetain(1_000);
      });
  }
};

const queryTemporaryRetainEffect = <T>(ref: QueryReference<T>) => {
  ref.temporaryRetain(5 * 60_000);
};

const queryIdleEffect = <T>(query: Query<T>, ref: QueryReference<T>) => {
  if (query.disconnectAfterIdleMs != null) {
    ref.idleRetain(query.disconnectAfterIdleMs);
  }
};

export const runUnmountedReadEffects = <T>(
  query: Query<T>,
  ref: QueryReference<T>,
) => {
  querySettleRetainEffect(ref);
  queryTemporaryRetainEffect(ref);
  queryIdleEffect(query, ref);
};

export const runMountEffects = <T>(
  _query: Query<T>,
  ref: QueryReference<T>,
) => {
  ref.releaseTemporaryRetain();
};

export const runReadEffects = <T>(query: Query<T>, ref: QueryReference<T>) => {
  queryIdleEffect(query, ref);
};

export const runUnsubscribeEffects = <T>(
  query: Query<T>,
  ref: QueryReference<T>,
) => {
  queryIdleEffect(query, ref);
};
