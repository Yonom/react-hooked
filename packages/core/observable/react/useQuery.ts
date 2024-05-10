import { useSyncExternalStore } from "react";

import useQueryHookState from "./useQueryHookState";
import { Query, QueryResult } from "../types";

function useQuery<T>(query: Query<T>): QueryResult<T> {
  const state = useQueryHookState(query);

  return useSyncExternalStore(state.subscribe, state.getResult);
}

export default useQuery;
