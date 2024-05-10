import QueryStore from "../QueryStore";
import type { Query } from "../types";

export const resetQuery = <T>(query: Query<T>) => {
  const ref = QueryStore.get(query);
  ref?.reset(query.observable);
};
