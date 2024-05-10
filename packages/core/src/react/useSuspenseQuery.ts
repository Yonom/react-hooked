import { use } from "./react-canary-polyfills";
import { useQuery } from "./useQuery";
import type { Query } from "../types";

export function useSuspenseQuery<T>(query: Query<T>): T {
  return use(useQuery(query));
}
