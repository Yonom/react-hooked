import { QueryCompletedWithoutValueError, QueryResetError } from "./errors";
import {
  COMPLETE_TOKEN,
  type FulfilledQueryResult,
  type QueryResult,
  type QuerySubscriber,
  RESET_TOKEN,
  type RejectedQueryResult,
} from "./types";

type QuerySubscribable<T> = {
  subscribe: (cb: QuerySubscriber<T>) => () => void;
};

const QueryResultFactory = {
  pending: <T>(instance: QuerySubscribable<T>): QueryResult<T> => {
    const result = new Promise<T>((resolve, reject) => {
      const unsubscribe = instance.subscribe((newResult) => {
        unsubscribe();

        if (
          newResult === RESET_TOKEN ||
          newResult === COMPLETE_TOKEN ||
          newResult.status === "rejected"
        ) {
          const rejectedResult = result as RejectedQueryResult<T>;
          rejectedResult.catch(() => {}); // suppress unhandled rejection
          rejectedResult.status = "rejected";

          if (newResult === RESET_TOKEN) {
            rejectedResult.reason = new QueryResetError();
          } else if (newResult === COMPLETE_TOKEN) {
            rejectedResult.reason = new QueryCompletedWithoutValueError();
          } else {
            rejectedResult.reason = newResult.reason;
          }

          reject(rejectedResult.reason);
        } else if (newResult.status === "fulfilled") {
          const fulfilledResult = result as FulfilledQueryResult<T>;
          fulfilledResult.status = "fulfilled";
          fulfilledResult.value = newResult.value;

          resolve(fulfilledResult.value);
        } else {
          throw new Error("Unexpected state");
        }
      });
    }) as unknown as QueryResult<T>;
    result.status = "pending";
    return result;
  },
  fulfill: <T>(value: T): QueryResult<T> => {
    const result = Promise.resolve(value) as unknown as FulfilledQueryResult<T>;
    result.status = "fulfilled";
    result.value = value;
    return result;
  },
  reject: <T>(reason: unknown): QueryResult<T> => {
    const result = Promise.reject(reason) as unknown as RejectedQueryResult<T>;
    result.catch(() => {}); // suppress unhandled rejection
    result.status = "rejected";
    result.reason = reason;
    return result;
  },
};

export default QueryResultFactory;
