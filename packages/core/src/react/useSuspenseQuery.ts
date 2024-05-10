import { use } from "./react-canary-polyfills";
import useQuery from "./useQuery";
import { Query } from "../types";

function useSuspenseQuery<T>(query: Query<T>): T {
  return use(useQuery(query));
}

export default useSuspenseQuery;
